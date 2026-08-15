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

  select coalesce((select fullname from public.public_users where id = auth.uid()), 'Admin')
  into v_actor;

  insert into public.ai_audit_logs (actor, action, detail, metadata)
  values (
    v_actor,
    case when p_suspended then 'Suspend user' else 'Unsuspend user' end,
    format('%s user %s', case when p_suspended then 'Suspended' else 'Unsuspended' end, p_user_id),
    jsonb_build_object('user_id', p_user_id, 'suspended', p_suspended)
  );
end;
$$