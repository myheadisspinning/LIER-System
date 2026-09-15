-- security-ratelimit stmt-004: record_auth_attempt
create or replace function public.record_auth_attempt(
  p_ip inet,
  p_email text default null,
  p_user_id uuid default null,
  p_success boolean default false,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fail15 integer;
  v_fail_window integer;
  v_existing_bans integer;
  v_new_count integer;
  v_duration interval;
begin
  insert into public.auth_attempt_log (ip, email, user_id, success, reason)
  values (p_ip, p_email, p_user_id, p_success, p_reason);

  if p_success then
    return false;
  end if;

  delete from public.ip_bans where expires_at <= now();

  select count(*) into v_fail15
    from public.auth_attempt_log
   where ip = p_ip and success = false
     and created_at > now() - interval '15 minutes';

  if v_fail15 < 5 then
    return false;
  end if;

  select count(*) into v_fail_window
    from public.auth_attempt_log
   where ip = p_ip and success = false
     and created_at > now() - interval '72 hours';

  select count(*) into v_existing_bans
    from public.ip_bans where ip = p_ip;

  v_new_count := v_existing_bans + 1;
  v_duration := case
    when v_new_count = 1 then interval '15 minutes'
    when v_new_count = 2 then interval '24 hours'
    else interval '7 days'
  end;

  insert into public.ip_bans (ip, reason, ban_count, created_by, expires_at)
  values (
    p_ip,
    coalesce(p_reason, 'Too many failed login attempts'),
    v_new_count,
    p_user_id,
    now() + v_duration
  )
  on conflict (ip) do update
    set ban_count = excluded.ban_count,
        reason = excluded.reason,
        expires_at = excluded.expires_at;

  return true;
end;
$$;

revoke all on function public.record_auth_attempt(inet, text, uuid, boolean, text) from public;
grant execute on function public.record_auth_attempt(inet, text, uuid, boolean, text) to service_role;