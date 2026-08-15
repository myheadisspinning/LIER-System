create or replace function public.admin_create_user(
  p_email text,
  p_password text,
  p_fullname text,
  p_role text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_actor text;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  if p_role not in ('user', 'officer', 'admin', 'superadmin') then
    raise exception 'Invalid role';
  end if;
  if p_role = 'superadmin' and not public.is_superadmin() then
    raise exception 'Only a superadmin may create a superadmin account.';
  end if;
  if exists (select 1 from auth.users where email = lower(p_email)) then
    raise exception 'An account with that email already exists.';
  end if;

  v_id := extensions.gen_random_uuid();
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
    lower(p_email),
    extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('role', p_role, 'fullname', p_fullname),
    now(), now(), '', '', '', ''
  );

  insert into public.public_users (id, fullname, role)
  values (v_id, p_fullname, p_role)
  on conflict (id) do nothing;

  select coalesce((select fullname from public.public_users where id = auth.uid()), 'Admin')
  into v_actor;

  insert into public.ai_audit_logs (actor, action, detail, metadata)
  values (
    v_actor,
    'Create account',
    format('Created %s account for %s', p_role, lower(p_email)),
    jsonb_build_object('user_id', v_id, 'role', p_role)
  );

  return v_id;
end;
$$