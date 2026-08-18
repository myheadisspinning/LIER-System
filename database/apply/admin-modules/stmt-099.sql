-- check_email_duplicate: returns true if 2+ auth.users rows share the same email.
-- Used by AuthCallback after Google OAuth to detect if the user already has a
-- manual email/password account.
create or replace function public.check_email_duplicate(p_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select (select count(*) from auth.users where email = lower(p_email)) > 1;
$$;

-- cleanup_duplicate_public_user: deletes the orphaned public_users row created
-- by the handle_new_user trigger for a duplicate Google OAuth user.
-- Does NOT touch auth.users (managed by Supabase GoTrue).
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
