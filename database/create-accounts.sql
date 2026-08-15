-- create-accounts.sql
-- Run in the Supabase SQL Editor (supabase.com -> SQL Editor -> New query).
-- Creates admin + superadmin auth accounts and links them to public_users roles.
-- Change the emails/passwords/fullnames below as needed.
--
-- SECURITY: Replace the placeholder passwords below with strong, unique values
-- before running. NEVER commit real passwords to the repository.

-- 1) Fix the trigger so signups fill profile columns + role
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

-- 2) Create the accounts (bcrypt-hashed passwords)
insert into auth.users (
  instance_id, id, aud, role,
  email, encrypted_password,
  email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
(
  '00000000-0000-0000-0000-000000000000',
  extensions.gen_random_uuid(),
  'authenticated', 'authenticated',
  'admin@culiat.ph',
  extensions.crypt('REPLACE_WITH_STRONG_ADMIN_PASSWORD', extensions.gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"admin","fullname":"Admin Desk Officer"}',
  now(), now(), '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  extensions.gen_random_uuid(),
  'authenticated', 'authenticated',
  'superadmin@culiat.ph',
  extensions.crypt('REPLACE_WITH_STRONG_SUPERADMIN_PASSWORD', extensions.gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"superadmin","fullname":"System Superadmin"}',
  now(), now(), '', '', '', ''
);

-- 3) Guarantee role rows (supplies fullname too, in case the trigger didn't fire)
insert into public.public_users (id, fullname, role)
select
  id,
  coalesce(nullif(raw_user_meta_data ->> 'fullname', ''), 'Unknown Resident'),
  coalesce(raw_user_meta_data ->> 'role', 'user')
from auth.users
where email in ('admin@culiat.ph', 'superadmin@culiat.ph')
on conflict (id) do update
  set role = excluded.role, fullname = excluded.fullname;

-- 4) Verify
select u.email, u.email_confirmed_at is not null as confirmed, p.role, p.fullname
from auth.users u
left join public.public_users p on p.id = u.id
where u.email in ('admin@culiat.ph', 'superadmin@culiat.ph');
