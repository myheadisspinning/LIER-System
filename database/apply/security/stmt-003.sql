-- security-ratelimit stmt-003: is_ip_banned check
create or replace function public.is_ip_banned(p_ip inet)
returns table (banned boolean, retry_after_seconds integer)
language sql
security definer
set search_path = public
as $$
  delete from public.ip_bans where expires_at <= now();

  select
    b.ip is not null as banned,
    case when b.ip is not null
         then greatest(0, extract(epoch from (b.expires_at - now())))::integer
         else 0
    end as retry_after_seconds
  from (select ip, expires_at from public.ip_bans where ip = p_ip) b;
$$;

revoke all on function public.is_ip_banned(inet) from public;
grant execute on function public.is_ip_banned(inet) to authenticated;
grant execute on function public.is_ip_banned(inet) to service_role;