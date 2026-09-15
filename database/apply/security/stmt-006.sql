-- security-ratelimit stmt-006: admin_unban_ip
create or replace function public.admin_unban_ip(p_ip inet)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  delete from public.ip_bans where ip = p_ip;
end;
$$;

revoke all on function public.admin_unban_ip(inet) from public;
grant execute on function public.admin_unban_ip(inet) to authenticated;