-- admin_delete_user: delete user from auth.users (cascades to
-- public_users). Logs deletion to audit log.
create or replace function public.admin_delete_user(
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor text;
  v_user_record public.public_users;
  v_email text;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  
  -- Get user record before deletion
  select * into v_user_record from public.public_users where id = p_user_id;
  if not found then
    raise exception 'User not found';
  end if;
  
  -- Get email from auth.users
  select email into v_email from auth.users where id = p_user_id;
  
  -- Cannot delete superadmin accounts unless caller is superadmin
  if v_user_record.role = 'superadmin' and not public.is_superadmin() then
    raise exception 'Cannot delete a superadmin account.';
  end if;
  
  -- Delete from auth.users (cascades to public_users)
  delete from auth.users where id = p_user_id;
  
  -- Get actor name for audit log
  select coalesce((select fullname from public.public_users where id = auth.uid()), 'Admin')
  into v_actor;
  
  -- Log the deletion
  insert into public.ai_audit_logs (actor, action, detail, metadata)
  values (
    v_actor,
    'Delete user',
    format('Deleted user %s (%s)', p_user_id, v_email),
    jsonb_build_object(
      'user_id', p_user_id,
      'email', v_email,
      'fullname', v_user_record.fullname,
      'role', v_user_record.role
    )
  );
end;
$$;
