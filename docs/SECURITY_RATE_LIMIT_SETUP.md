# Security: Rate Limiting, IP Bans & Turnstile CAPTCHA

This document describes the Tier 1 client-gate security stack layered on top of
Supabase Auth. It covers the Postgres tables, RPCs, edge functions, frontend
integration, and Supabase Turnstile CAPTCHA.

---

## Architecture overview

```
Browser                       Vercel SPA
   |                               |
   |  1. POST /auth/v1/token (pw)  |  ← Supabase SDK
   |------------------------------>|
   |  2. Edge: POST /auth-gate     |  ← client-gate pre-flight (check IP ban)
   |      check + record result    |
   |  3. Supabase Auth             |  ← server-enforced via GoTrue built-in 30/5min-per-IP
   |  4. Client records outcome    |  ← POST /auth-gate record mode
   |<-- 200 OK / 429 blocked ------|
```

**What this gives you:**
- A friendly "too many attempts" message long before GoTrue's raw 30/5 cap
- 15-min → 24-h → 7-day escalating bans with a visible Admin IP Bans page
- Turnstile CAPTCHA on sign-in and sign-up to stop bots
- Audit-log integration for every record/manual-ban action

**What this does NOT enforce (accepted Tier 1 limits):**
- A non-browser attacker can skip the client-gate report and hit GoTrue directly
  (GoTrue's own 30/5-min cap still limits them)
- A crafted `x-forwarded-for` header won't give the attacker a new IP since Vercel
  normalises the client IP at the edge

---

## Database objects

All SQL lives in:

- `database/security-ratelimit.sql` — master reference (all statements)
- `database/apply/security/stmt-001..007.sql` — per-statement idempotent splits

### Tables

**`auth_attempt_log`**

| Column      | Type         | Notes                                          |
|-------------|--------------|------------------------------------------------|
| id          | bigint PK    | identity                                       |
| ip          | inet NOT NULL | raw client IP (IPv4-mapped prefix stripped)   |
| email       | text         | normalised login email (nullable)              |
| user_id     | uuid         | auth user if known (nullable)                  |
| success     | boolean      | true = login succeeded                         |
| reason      | text         | optional label (e.g. "Invalid credentials")    |
| created_at  | timestamptz  | default now()                                  |

RLS enabled; policy allows `service_role` only.

**`ip_bans`**

| Column     | Type         | Notes                                      |
|------------|--------------|--------------------------------------------|
| ip         | inet PK      | one row per IP                             |
| reason     | text         | human-readable                             |
| ban_count  | integer      | escalation counter (1→15m, 2→24h, 3+→7d) |
| created_by | uuid         | admin UID or null (auto-created)           |
| expires_at | timestamptz  | lazy-purged after now()                    |
| created_at | timestamptz  |                                            |

RLS enabled; policy allows `service_role` only.

### RPCs

| Function | Signature | Grants | Purpose |
|---|---|---|---|
| `is_ip_banned` | `(p_ip inet) → (banned bool, retry_after_seconds int)` | anon, authenticated, service_role | Check + lazy-purge expired ban |
| `record_auth_attempt` | `(p_ip inet, p_email text, p_user_id uuid, p_success bool, p_reason text) → boolean` | service_role | Log attempt; auto-ban at thresholds |
| `admin_list_ip_bans` | `() → TABLE(ip, reason, ban_count, expires_at, created_at)` | authenticated | Admin UI data source |
| `admin_unban_ip` | `(p_ip inet) → void` | authenticated | Remove a ban |
| `admin_ban_ip` | `(p_ip inet, p_reason text, p_duration interval) → void` | authenticated | Manual ban (audit-logged) |

### Ban escalation logic (`record_auth_attempt`)

On every `p_success = false` row:

1. Count failures from that IP in the **15-minute** rolling window.
2. If count < 5 → no ban; return.
3. Otherwise get the existing `ip_bans.ban_count` for the IP (0 if none).
4. Increment: next ban count = existing + 1.
5. Duration: `1 → 15 minutes`, `2 → 24 hours`, `≥ 3 → 7 days`.
6. Upsert into `ip_bans`; return banned.

Successful attempts (`p_success = true`) never create or extend a ban.

---

## Edge functions

### `auth-gate` (`supabase/functions/auth-gate/index.ts`)

| Field | Details |
|---|---|
| Endpoint | `POST /functions/v1/auth-gate` |
| Auth | None (called before login) |
| Body | `{ mode: "check" \| "record", email?, userId?, success?, reason? }` |
| IP source | `x-forwarded-for` first value, IPv4-mapped prefix stripped |

**Mode `check`**  
Calls `is_ip_banned(clientIp)`. Returns 429 with `Retry-After` header if banned.

**Mode `record`**  
Calls `record_auth_attempt(clientIp, ...)`. Skips if email is in the whitelist  
(Current: `superadminculiat@gmail.com`). Returns `{ banned, ip }`.

### Hardened `send-admin-otp` / `verify-admin-otp`

Both edge functions now:

1. Call `is_ip_banned(clientIp)` at the top → 429 if banned.
2. On wrong-OTP failure, `verify-admin-otp` calls `record_auth_attempt` to feed
   the escalating ban ladder.

---

## Frontend

### `lib/security.ts`

| Export | Purpose |
|---|---|
| `authGate(mode, opts)` | Thin wrapper around the `auth-gate` edge function |
| `recordAuthAttempt(opts)` | Shorthand for `authGate('record', ...)` |
| `formatRetryAfter(seconds)` | Human-readable duration |

### Pages wired

| Page | What's wired |
|---|---|
| `SignIn.tsx` | Pre-flight `check` gate; `record` on failure; Turnstile widget + `captchaToken` in `options` |
| `SignUp.tsx` | Pre-flight `check` gate; `record` on error; Turnstile widget + `captchaToken` in `options` |
| `ForgotPassword.tsx` | Pre-flight `check` gate; `record` on error |
| `OTPVerificationModal.tsx` | Pre-flight `check` gate before send and verify (server also enforces independently) |

### Turnstile

A new `TurnstileCaptcha` component dynamically loads the Turnstile script and
renders the widget. When the token expires or errors, `onToken(null)` is called.

Controlled via env var:

```
VITE_TURNSTILE_SITE_KEY=<your-public-site-key>
```

If the env var is unset, the captcha is silently skipped (same as before this
feature). The secret goes in `supabase/config.toml` via `env(TURNSTILE_SECRET_KEY)`.

---

## Supabase config

`supabase/config.toml` (diff):

```toml
[auth.captcha]
enabled = true
provider = "turnstile"
secret = "env(TURNSTILE_SECRET_KEY)"
```

---

## Admin IP Bans page

`/admin/ip-bans` — available to admins and superadmins.

Features:
- Table of active bans with IP, reason, escalation count, expiry countdown
- Unban button (with confirmation)
- Manual ban modal (IP + reason + duration preset)
- CSV export
- Search/filter
- Pagination

Route registered in `App.tsx`; sidebar nav entry in `nav.ts` (AdminLayout).

---

## Deployment steps

### 1. Turnstile

1. Create a Turnstile site at https://dash.cloudflare.com/turnstile → get the **site key** (public) and **secret** (private).
2. In Supabase dashboard → Settings → Edge Functions → Environment Variables:
   - Add `TURNSTILE_SECRET_KEY = <secret>`
3. In Vercel project → Settings → Environment Variables:
   - Add `VITE_TURNSTILE_SITE_KEY = <site-key>`

### 2. Apply database migration

Run `database/apply/security/stmt-001.sql` through `stmt-007.sql` in order via
the Supabase SQL Editor (one at a time).

Or run the full `database/security-ratelimit.sql` in one shot via the SQL Editor.

### 3. Deploy edge function

```bash
supabase functions deploy auth-gate
supabase functions deploy send-admin-otp
supabase functions deploy verify-admin-otp
```

### 4. Update `supabase/config.toml`

Enable the `[auth.captcha]` block as shown above, then redeploy or apply the
config change from the Supabase dashboard.

### 5. Frontend

Push the changes. Vercel will auto-deploy.

---

## Troubleshooting

**"Too many attempts" shows before any login attempt**  
The browser is hitting a stale cached ban. Wait for `retry_after_seconds` to
expire, or an admin unban via `/admin/ip-bans`.

**Captcha doesn't appear on sign-in / sign-up**  
Check `VITE_TURNSTILE_SITE_KEY` is set in Vercel and the build was deployed
after the env var was added.

**RPC errors when applying the SQL**  
Make sure each stmt file is run in order. All statements are idempotent
(`create table if not exists`, `create or replace function`).

**Edge function 429 even after ban expires**  
The `is_ip_banned` function lazy-purges expired bans on every call. If you see
stale bans, run `DELETE FROM public.ip_bans WHERE expires_at <= now();` manually.
