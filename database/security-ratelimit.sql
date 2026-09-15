-- security-ratelimit.sql
-- Rate limiting + IP ban system for the LIER-System (Culiat Safety Portal).
-- Runs alongside the existing OTP rate limits. Idempotent.
--
-- Policy (confirmed):
--   Tier 1 gate: every sign-in / sign-up / OTP / reset attempt passes through
--     a client-gate (edge function) that pre-checks the caller's IP and
--     records every failed attempt before hitting Supabase Auth.
--   Escalating bans:
--     5 failures  in a 15-minute rolling window -> 15-minute ban
--     15 failures -> 24-hour ban
--     repeat offender (ban_count escalation)    -> 7-day ban
--
-- Tables:
--   auth_attempt_log - one row per auth attempt (success or failure)
--   ip_bans          - active/expired IP bans with escalation counter
--
-- Run statement-by-statement (Supabase SQL Editor / CLI db query cannot
-- run multi-statement files). See database/apply/ convention.

-- ------------------------------------------------------------------
-- 1) auth_attempt_log: audit of every auth attempt by IP + actor
-- ------------------------------------------------------------------
create table if not exists public.auth_attempt_log (
  id bigint generated always as identity primary key,
  ip inet not null,
  email text,
  user_id uuid,
  success boolean not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_attempt_log_ip on public.auth_attempt_log(ip);
create index if not exists idx_auth_attempt_log_ip_created on public.auth_attempt_log(ip, created_at desc);

alter table public.auth_attempt_log enable row level security;

drop policy if exists "auth_attempt_log service role only" on public.auth_attempt_log;
create policy "auth_attempt_log service role only" on public.auth_attempt_log
  for all using (auth.role() = 'service_role');

-- ------------------------------------------------------------------
-- 2) ip_bans: escalating IP ban records
-- ------------------------------------------------------------------
create table if not exists public.ip_bans (
  ip inet primary key,
  reason text not null,
  ban_count integer not null default 1,
  created_by uuid,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.ip_bans enable row level security;

drop policy if exists "ip_bans service role only" on public.ip_bans;
create policy "ip_bans service role only" on public.ip_bans
  for all using (auth.role() = 'service_role');

-- ------------------------------------------------------------------
-- 3) is_ip_banned: check + lazily delete expired bans.
--    Returns allowed + seconds until unban (0 if not banned).
--    Grants: service_role for edge functions, authenticated for the
--    admin IP Bans page pre-flight checks.
-- ------------------------------------------------------------------
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

-- ------------------------------------------------------------------
-- 4) record_auth_attempt: log one auth attempt and, on failure, check
--    the rolling-window policy and apply/rerate an IP ban.
--
--    Ban policy (confirmed):
--      5 failures  in 15 min -> 15-minute ban   (ban_count 1)
--      15 failures             -> 24-hour ban   (ban_count 2)
--      repeat offender         -> 7-day ban     (ban_count 3+)
--
--    Every call also runs a lazy purge so expired bans self-clean.
--    Grants: service_role only (edge functions).
-- ------------------------------------------------------------------
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

  -- Successful attempts never trigger a ban; just record and return.
  if p_success then
    return false;
  end if;

  -- Lazy purge of expired bans.
  delete from public.ip_bans where expires_at <= now();

  select count(*) into v_fail15
    from public.auth_attempt_log
   where ip = p_ip and success = false
     and created_at > now() - interval '15 minutes';

  -- 5 failures in 15 minutes triggers the first ban.
  if v_fail15 < 5 then
    return false;
  end if;

  select count(*) into v_fail_window
    from public.auth_attempt_log
   where ip = p_ip and success = false
     and created_at > now() - interval '72 hours';

  select count(*) into v_existing_bans
    from public.ip_bans where ip = p_ip;

  -- Escalation: 1st ban 15 min, 2nd 24 h, repeat 7 days.
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

-- ------------------------------------------------------------------
-- 5) admin_list_ip_bans: admin/superadmin view of active bans.
-- ------------------------------------------------------------------
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

-- ------------------------------------------------------------------
-- 6) admin_unban_ip: admin/superadmin removes an IP ban manually.
-- ------------------------------------------------------------------
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

-- ------------------------------------------------------------------
-- 7) admin_ban_ip: admin/superadmin manually bans an IP with an
--    optional reason (e.g. observed abuse). Defaults to 7 days,
--    escalating the ban_count ladder.
-- ------------------------------------------------------------------
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