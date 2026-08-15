create or replace function public.admin_reset_password(
  p_user_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tmp text;
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

  v_tmp := 'Tmp' || (floor(random() * 900000) + 100000)::int::text || '!';
  update auth.users
  set encrypted_password = extensions.crypt(v_tmp, extensions.gen_salt('bf', 10)),
      updated_at = now()
  where id = p_user_id;

  select coalesce((select fullname from public.public_users where id = auth.uid()), 'Admin')
  into v_actor;

  insert into public.ai_audit_logs (actor, action, detail, metadata)
  values (
    v_actor,
    'Reset password',
    format('Reset password for user %s', p_user_id),
    jsonb_build_object('user_id', p_user_id)
  );

  return v_tmp;
end;
$$