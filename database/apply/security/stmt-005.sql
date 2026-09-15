-- security-ratelimit stmt-005: admin_list_ip_bans
create or replace function public.admin_list_ip_bans()
returns table (
  ip inet,
  reason text,
  ban_count integer,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  delete from public.ip_bans where expires_at <= now();

  return query
    select b.ip, b.reason, b.ban_count, b.expires_at, b.created_at
    from public.ip_bans b
    order by b.expires_at desc;
end;
$$;

revoke all on function public.admin_list_ip_bans() from public;
grant execute on function public.admin_list_ip_bans() to authenticated;