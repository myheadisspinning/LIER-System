-- Fix: Google OAuth accounts show as ONLINE to themselves but OFFLINE in the
-- admin Account Settings "Online" column (and the "Online Now" stat).
--
-- Root cause:
--   presence.user_id has a hard FK -> public.public_users (id).
--   Google OAuth signups don't always have a public_users row:
--     - AuthCallback runs cleanup_duplicate_public_user() which DELETES the
--       public_users row for the Google session's auth id when the email is
--       already registered with a password (database/apply/admin-modules/stmt-099.sql).
--       A later clean Google sign-in then has NO public_users row.
--     - Or the on_auth_user_created trigger was never installed/backfilled in
--       this database.
--   The heartbeat upsert (frontend/src/lib/admin.ts -> upsertPresence) then
--   fails the FK check and the error is swallowed, so the row is never written
--   and the user permanently shows "Offline".
--
-- Fix:
--   - Drop the public_users FK. Presence is write-scoped by RLS
--     ("presence own all" -> auth.uid() = user_id) and displays denormalized
--     user_name/role snapshots, so any authenticated auth.users id is valid.
--   - Make the table + policies idempotent (no-op if already present) so this
--     file alone brings presence up even on a DB that never ran stmt-045..050.

-- 1) Ensure the table exists WITHOUT the public_users FK.
create table if not exists public.presence (
  user_id uuid primary key,
  user_name text not null default 'User',
  role text not null default 'user',
  last_seen_at timestamptz not null default now()
);

-- 2) Remove the public_users dependency (auto-named constraint).
alter table public.presence drop constraint if exists presence_user_id_fkey;

-- 3) Re-assert RLS + policies (idempotent).
alter table public.presence enable row level security;

drop policy if exists "presence read all" on public.presence;
create policy "presence read all" on public.presence
  for select using (auth.role() = 'authenticated');

drop policy if exists "presence own all" on public.presence;
create policy "presence own all" on public.presence
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);