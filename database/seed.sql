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
  role text not null check (role in ('user', 'officer', 'admin', 'superadmin'))
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

-- Owner can read/update their own role row; admins/superadmins manage all.
create policy "owner read own" on public.public_users
  for select using (auth.uid() = id);

create policy "superadmin manage" on public.public_users
  for all using (public.is_superadmin());

-- Auto-create a profile + role row for every new auth signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.public_users (id, fullname, dob, gender, address, phone, email_confirmed_at, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'fullname', ''), 'Unknown Resident'),
    nullif(new.raw_user_meta_data ->> 'dob', '')::date,
    new.raw_user_meta_data ->> 'gender',
    new.raw_user_meta_data ->> 'address',
    new.raw_user_meta_data ->> 'phone',
    new.email_confirmed_at,
    coalesce(new.raw_user_meta_data ->> 'role', 'user')
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
  coalesce(nullif(raw_user_meta_data ->> 'fullname', ''), 'Unknown Resident'),
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
