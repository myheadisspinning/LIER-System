# Google Sign-In Branding Setup ("continue to fuphuqkxibmqermtcjoe.supabase.co" → "Barangay Culiat Safety")

## Why the Supabase domain shows on Google

When signing in with Google, the account chooser / consent screen shows the name of the
**OAuth client** that performed the request. If the Supabase project uses Supabase's
built-in (shared) Google provider without custom credentials, Google only knows the
Supabase project domain, so it displays `fuphuqkxibmqermtcjoe.supabase.co`.

This cannot be changed in the app code — the name comes from Google Cloud's OAuth
consent screen configuration. Fix it by creating your own Google OAuth client branded
as **Barangay Culiat Safety** and registering it in Supabase.

## Step 1 — Google Cloud Console

1. Go to <https://console.cloud.google.com> and create (or select) a project.
2. **APIs & Services → OAuth consent screen**:
   - User type: **External**
   - App name: **Barangay Culiat Safety**
   - User support email + developer contact email
   - App domain → Application home page: your production URL — **only if it is on a domain you own**
     (see "Troubleshooting" below)
   - Authorized domains: only domains whose registered ("top private") domain you own —
     shared hosting subdomains (`*.vercel.app`, `*.supabase.co`, `*.netlify.app`, `*.pages.dev`, …) are **rejected**
   - Scopes: keep defaults (`.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`)
   - Save, then **Publish app** (required so returning users are not blocked by "unverified app" warnings).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins:
     - `https://your-production-domain`
     - `http://localhost:5173` (local Vite dev)
   - Authorized redirect URIs (must include the Supabase callback):
     - `https://fuphuqkxibmqermtcjoe.supabase.co/auth/v1/callback`
4. Copy the generated **Client ID** and **Client secret**.

## Step 2 — Supabase Dashboard

1. Open the Supabase project → **Authentication → Sign In / Providers → Google**.
2. Enable the provider and paste the **Client ID** and **Client secret** from Step 1.
3. Save.

## Troubleshooting — "Invalid domain: must be a top private domain"

Google only accepts **Authorized domains** (consent screen / branding) whose registrable
("top private") domain you own. Shared hosting platforms are on the public suffix list, so
Google refuses them — you cannot claim `your-app.vercel.app`, `fuphuqkxibmqermtcjoe.supabase.co`,
`your-app.netlify.app`, `your-app.pages.dev`, `your-app.onrender.com`, `your-app.web.app`,
`your-app.github.io`, etc. This is not fixable; Google only lets the platform owner authorize
the parent domain.

What goes where:

| Google field | Accepts shared-host subdomains? | What to enter |
|---|---|---|
| OAuth client → **Authorized redirect URIs** | ✅ Yes | `https://fuphuqkxibmqermtcjoe.supabase.co/auth/v1/callback` |
| OAuth client → **Authorized JavaScript origins** | ✅ Yes | your app origin(s), e.g. `https://your-app.vercel.app`, `http://localhost:5173` |
| Consent screen (Branding) → **Authorized domains** | ❌ No | only a domain you own, e.g. `your-domain.com` or a subdomain of it |

Options:

1. **Custom domain (recommended)** — register a domain (e.g. `barangayculiatsafety.com`, or a
   `.gov.ph` domain) and attach it to your deployment (Vercel/Netlify support custom domains on
   the free tier). Add it to Authorized domains and use it as the Application home page. This is
   what gets you the full "Barangay Culiat Safety" branding on Google's screens.
2. **Skip branding for now** — the consent screen domain fields are branding-only; they do **not**
   affect whether sign-in works. Leave **Application home page** empty, remove any rejected domain
   from Authorized domains, and save. Sign-in is controlled entirely by the OAuth client's
   redirect URIs / JavaScript origins, which do accept `supabase.co` and `vercel.app` URLs.
3. **Never** put `fuphuqkxibmqermtcjoe.supabase.co` in Authorized domains — it belongs only in the
   OAuth client's **Authorized redirect URIs**.

## Result

- Google's account chooser and consent screens now show **"Barangay Culiat Safety"**
  (with your logo) instead of `fuphuqkxibmqermtcjoe.supabase.co`.
- No app code changes are required — `signInWithOAuth({ provider: 'google' })` in
  `frontend/src/pages/SignIn.tsx` stays exactly the same.

## Related

- The app's sign-in request already uses `prompt: 'select_account'`
  (`frontend/src/pages/SignIn.tsx`), so Google always shows the account chooser and its own
  consent/confirmation step on Google's screens — no extra confirmation inside the app is needed.
