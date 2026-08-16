-- admin_update_user: update user profile fields (fullname, phone,
-- address, dob, gender). Cannot change email or role.
-- Logs changes to audit log.
create or replace function public.admin_update_user(
  p_user_id uuid,
  p_fullname text,
  p_phone text,
  p_address text,
  p_dob date,
  p_gender text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor text;
  v_old_record public.public_users;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  
  -- Get old record for audit log
  select * into v_old_record from public.public_users where id = p_user_id;
  if not found then
    raise exception 'User not found';
  end if;
  
  -- Cannot modify superadmin accounts unless caller is superadmin
  if v_old_record.role = 'superadmin' and not public.is_superadmin() then
    raise exception 'Cannot modify a superadmin account.';
  end if;
  
  -- Update the user profile
  update public.public_users
  set fullname = p_fullname,
      phone = p_phone,
      address = p_address,
      dob = p_dob,
      gender = p_gender
  where id = p_user_id;
  
  -- Get actor name for audit log
  select coalesce((select fullname from public.public_users where id = auth.uid()), 'Admin')
  into v_actor;
  
  -- Log the update
  insert into public.ai_audit_logs (actor, action, detail, metadata)
  values (
    v_actor,
    'Update user',
    format('Updated profile for user %s', p_user_id),
    jsonb_build_object(
      'user_id', p_user_id,
      'old_fullname', v_old_record.fullname,
      'new_fullname', p_fullname,
      'old_phone', v_old_record.phone,
      'new_phone', p_phone,
      'old_address', v_old_record.address,
      'new_address', p_address,
      'old_dob', v_old_record.dob,
      'new_dob', p_dob,
      'old_gender', v_old_record.gender,
      'new_gender', p_gender
    )
  );
end;
$$;
