-- is_email_registered: checks if an email already has an auth account.
-- Used by the public signup page to reject duplicate emails up front,
-- because GoTrue deliberately returns a fake user (no error) for existing
-- accounts when email confirmations are enabled (anti user-enumeration).
create or replace function public.is_email_registered(p_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from auth.users where email = lower(p_email)
  );
$$;
