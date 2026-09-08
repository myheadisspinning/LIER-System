-- create-officer.sql
-- Run in the Supabase SQL Editor (supabase.com -> SQL Editor -> New query).
-- Creates an Officer (Duty Officer) auth account and links it to public_users with role 'officer'.
--
-- HOW TO USE:
--   Edit ONLY the three lines below inside the single quotes:
--     'TYPE_OFFICER_EMAIL_HERE'     -> e.g. 'officer1@gmail.com'
--     'TYPE_OFFICER_PASSWORD_HERE'  -> a strong password (8+ characters)
--     'TYPE_OFFICER_FULLNAME_HERE'  -> e.g. 'Juan Dela Cruz'
--   Then copy the ENTIRE file into the SQL Editor and click Run.
--
-- SECURITY: Never commit a real password. Change it after first sign-in.
--
-- This script auto-confirms the email (email_confirmed_at = now()) so the officer
-- can sign in immediately, mirroring the existing create-accounts.sql behavior.
-- If you want the officer to confirm their email first instead, change
--   email_confirmed_at to:  null
-- (then the account will be 'Pending' until they confirm via a real link).

do $$
declare
  v_email text := 'lugawnacion@gmail.com';
  v_password text := 'lugaw12345';
  v_fullname text := 'Alfred D. Santo';
  v_unit_name text := 'Tanod Patrol Unit 2';
  v_id uuid;
begin
  -- Reject if the email already has an account
  if exists (select 1 from auth.users where email = lower(v_email)) then
    raise exception 'An account with that email already exists: %', v_email;
  end if;

  v_id := extensions.gen_random_uuid();

  -- 1) Create the auth user (bcrypt-hashed password). Email auto-confirmed.
  insert into auth.users (
    instance_id, id, aud, role,
    email, encrypted_password,
    email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_id,
    'authenticated', 'authenticated',
    lower(v_email),
    extensions.crypt(v_password, extensions.gen_salt('bf', 10)),
    now(),                               -- change to null to require email confirmation
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('role', 'officer', 'fullname', v_fullname),
    now(), now(), '', '', '', ''
  );

  -- 2) Guarantee the public_users row with role 'officer' (only on first insert)
  insert into public.public_users (id, fullname, role, email_confirmed_at)
  values (v_id, v_fullname, 'officer', now())
  on conflict (id) do nothing;

  -- 3) Link this officer to a dispatch unit as Lead Officer (for the roster / officer portal).
  update public.dispatch_units
  set lead_officer_id = v_id
  where name = v_unit_name;

  raise notice 'Officer account created: %', v_email;
end $$;

-- 4) Verify the created account (shows the newest officer account)
select u.id, u.email, u.email_confirmed_at is not null as confirmed, p.fullname, p.role
from auth.users u
left join public.public_users p on p.id = u.id
where p.role = 'officer'
order by u.created_at desc
limit 1;