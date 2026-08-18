-- check_user_access: checks if a user still exists in auth.users and whether
-- they are suspended. Returns a single row with user_exists and is_suspended.
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
