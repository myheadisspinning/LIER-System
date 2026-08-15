-- admin-modules.sql
-- Adds the tables, RLS policies, RPCs, and triggers that power the
-- admin portal modules (Officials, Broadcasts/Notifications, Contacts
-- Inbox, Blotters, Reports Archives, Tanod/officer linkage, Account
-- Settings) plus the officer responder flow. Idempotent (safe to re-run).
--
-- NOTE: apply statement-by-statement (Supabase CLI db query cannot run
-- multi-statement files). See database/apply/admin-modules/ for the split.

-- ------------------------------------------------------------------
-- 1) public_users.suspended (blocks sign-in for suspended accounts)
-- ------------------------------------------------------------------
alter table public.public_users
  add column if not exists suspended boolean not null default false