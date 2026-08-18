-- Seed: public_users (profile + role-based access)
-- Run in Supabase SQL Editor. Accounts themselves live in Supabase Auth;
-- this links each auth user to a role via public_users.id = auth.users.id.
-- fullname is NOT NULL; the trigger/backfill supply it from auth.users
-- user_metadata (fallback 'Unknown Resident').

create table if not exists public.public_users (
  id uuid primary key references auth.users (id) on delete cascade,
  fullname text not null,
  dob date,
  gender text,
  address text,
  phone text,
  created_at timestamptz default now(),
  email_confirmed_at timestamptz,
  role text not null check (role in ('user', 'officer', 'admin', 'superadmin')),
  avatar_url text
);

-- Idempotent upgrades: if public_users already exists from an earlier
-- version without these columns, add them instead of failing below.
alter table public.public_users
  add column if not exists fullname text not null default 'Unknown Resident';

alter table public.public_users
  add column if not exists dob date;

alter table public.public_users
  add column if not exists gender text;

alter table public.public_users
  add column if not exists address text;

alter table public.public_users
  add column if not exists phone text;

alter table public.public_users
  add column if not exists created_at timestamptz default now();

alter table public.public_users
  add column if not exists email_confirmed_at timestamptz;

alter table public.public_users
  add column if not exists role text not null
  check (role in ('user', 'officer', 'admin', 'superadmin'));

alter table public.public_users
  add column if not exists avatar_url text;

alter table public.public_users enable row level security;

-- Security definer helper (avoids infinite recursion when the policy
-- subqueries the same table it guards).
create or replace function public.is_superadmin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.public_users where id = auth.uid() and role = 'superadmin'
  );
$$;

-- Check if an email has duplicate auth users (manual signup + Google OAuth).
-- Returns true if 2+ auth.users rows share the same email.
create or replace function public.check_email_duplicate(p_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select (select count(*) from auth.users where email = lower(p_email)) > 1;
$$;

-- Clean up an orphaned public_users row created by the handle_new_user trigger
-- for a duplicate Google OAuth user. Does NOT touch auth.users.
create or replace function public.cleanup_duplicate_public_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.public_users where id = p_user_id;
end;
$$;

-- Check if a user still exists and is not suspended.
-- Used by RoleGuard, SignIn, and AuthCallback to enforce access control.
create or replace function public.check_user_access(p_user_id uuid)
returns table (user_exists boolean, is_suspended boolean)
language sql
security definer
set search_path = public
as $$
  select
    exists(select 1 from auth.users where id = p_user_id),
    coalesce((select suspended from public.public_users where id = p_user_id), false);
$$;

-- Owner can read/update their own role row; admins/superadmins manage all.
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'owner read own' and tablename = 'public_users' and schemaname = 'public') then
    create policy "owner read own" on public.public_users
      for select using (auth.uid() = id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'superadmin manage' and tablename = 'public_users' and schemaname = 'public') then
    create policy "superadmin manage" on public.public_users
      for all using (public.is_superadmin());
  end if;
end $$;

-- Auto-create a profile + role row for every new auth signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.public_users (id, fullname, dob, gender, address, phone, email_confirmed_at, role, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'fullname', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      'Unknown Resident'
    ),
    nullif(new.raw_user_meta_data ->> 'dob', '')::date,
    new.raw_user_meta_data ->> 'gender',
    new.raw_user_meta_data ->> 'address',
    new.raw_user_meta_data ->> 'phone',
    new.email_confirmed_at,
    coalesce(new.raw_user_meta_data ->> 'role', 'user'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: give every EXISTING auth user (created before the trigger) a row.
insert into public.public_users (id, fullname, role)
select
  id,
  coalesce(
    nullif(raw_user_meta_data ->> 'fullname', ''),
    nullif(raw_user_meta_data ->> 'full_name', ''),
    nullif(raw_user_meta_data ->> 'name', ''),
    'Unknown Resident'
  ),
  coalesce(raw_user_meta_data ->> 'role', 'user')
from auth.users
on conflict (id) do nothing;

-- Sample role assignments (replace UUIDs with real auth user ids)
-- insert into public.public_users (id, role) values
--   ('REPLACE_WITH_USER_UUID',        'user'),
--   ('REPLACE_WITH_OFFICER_UUID',     'officer'),
--   ('REPLACE_WITH_ADMIN_UUID',       'admin'),
--   ('REPLACE_WITH_SUPERADMIN_UUID',  'superadmin');
-- Re-run anytime to re-assign: update public.public_users set role = 'admin' where id = 'REPLACE_WITH_ADMIN_UUID';
