create or replace function public.admin_set_role(
  p_user_id uuid,
  p_role text
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
  if p_role not in ('user', 'officer', 'admin', 'superadmin') then
    raise exception 'Invalid role';
  end if;
  if exists (
    select 1 from public.public_users where id = p_user_id and role = 'superadmin'
  ) and not public.is_superadmin() then
    raise exception 'Cannot modify a superadmin account.';
  end if;
  if p_role = 'superadmin' and not public.is_superadmin() then
    raise exception 'Only a superadmin may grant superadmin.';
  end if;

  insert into public.public_users (id, fullname, role)
  values (p_user_id, 'Unknown Resident', p_role)
  on conflict (id) do update set role = excluded.role;

  select coalesce((select fullname from public.public_users where id = auth.uid()), 'Admin')
  into v_actor;

  insert into public.ai_audit_logs (actor, action, detail, metadata)
  values (
    v_actor,
    'Change role',
    format('Changed role to %s for user %s', p_role, p_user_id),
    jsonb_build_object('user_id', p_user_id, 'role', p_role)
  );
end;
$$