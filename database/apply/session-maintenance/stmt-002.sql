-- session-maintenance.sql
-- Hardens admin_suspend_user so a suspension immediately ends all of
-- the user's active sessions (auto logout) and marks them offline,
-- in addition to blocking future sign-ins.
-- Idempotent: uses create or replace, safe to re-run.
--
-- Run statement-by-statement (Supabase SQL Editor / CLI db query cannot
-- run multi-statement files).

create or replace function public.admin_suspend_user(
  p_user_id uuid,
  p_suspended boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor text;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  if exists (
    select 1 from public.public_users where id = p_user_id and role = 'superadmin'
  ) and not public.is_superadmin() then
    raise exception 'Cannot modify a superadmin account.';
  end if;

  insert into public.public_users (id, fullname, role)
  values (p_user_id, 'Unknown Resident', 'user')
  on conflict (id) do update set suspended = excluded.suspended;

  -- Suspending also ends any active sessions and drops them off the
  -- online/presence feed so the account is fully cut off.
  if p_suspended then
    delete from auth.sessions where user_id = p_user_id;
    insert into public.presence (user_id, last_seen_at)
    values (p_user_id, '1970-01-01T00:00:00Z')
    on conflict (user_id)
    do update set last_seen_at = excluded.last_seen_at;
  end if;

  select coalesce((select fullname from public.public_users where id = auth.uid()), 'Admin')
  into v_actor;

  insert into public.ai_audit_logs (actor, action, detail, metadata)
  values (
    v_actor,
    case when p_suspended then 'Suspend user' else 'Unsuspend user' end,
    case when p_suspended then 'Suspended and signed out user ' || p_user_id
         else 'Unsuspended user ' || p_user_id end,
    jsonb_build_object('user_id', p_user_id, 'suspended', p_suspended)
  );
end;
$$;

revoke all on function public.admin_suspend_user(uuid, boolean) from public;
grant execute on function public.admin_suspend_user(uuid, boolean) to authenticated;