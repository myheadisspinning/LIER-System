-- security-ratelimit stmt-007: admin_ban_ip
create or replace function public.admin_ban_ip(
  p_ip inet,
  p_reason text default 'Banned by administrator',
  p_duration interval default interval '7 days'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_bans integer;
  v_new_count integer;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  select count(*) into v_existing_bans
    from public.ip_bans where ip = p_ip;

  v_new_count := v_existing_bans + 1;

  insert into public.ip_bans (ip, reason, ban_count, created_by, expires_at)
  values (p_ip, p_reason, v_new_count, auth.uid(), now() + p_duration)
  on conflict (ip) do update
    set reason = excluded.reason,
        ban_count = excluded.ban_count,
        expires_at = excluded.expires_at;

  insert into public.ai_audit_logs (actor, action, detail, metadata)
  values (
    coalesce((select fullname from public.public_users where id = auth.uid()), 'Admin'),
    'Ban IP',
    format('Banned %s: %s', p_ip, p_reason),
    jsonb_build_object('ip', p_ip::text, 'reason', p_reason, 'expires_at', (now() + p_duration)::text)
  );
end;
$$;

revoke all on function public.admin_ban_ip(inet, text, interval) from public;
grant execute on function public.admin_ban_ip(inet, text, interval) to authenticated;