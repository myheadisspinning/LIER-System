-- admin-otp.sql
-- Run in the Supabase SQL Editor.
-- Creates the OTP verification table for admin 2FA login.

-- 1) OTP verification table
create table if not exists public.admin_otp_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  otp_code text not null,
  channel text not null check (channel in ('email', 'sms')),
  verified boolean default false,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- Indexes for quick lookup
create index if not exists idx_admin_otp_user_id on public.admin_otp_verifications(user_id);
create index if not exists idx_admin_otp_expires on public.admin_otp_verifications(expires_at);

-- RLS: only service role (edge functions) can access
alter table public.admin_otp_verifications enable row level security;

-- Allow service role full access
drop policy if exists "Service role manages OTP" on public.admin_otp_verifications;
create policy "Service role manages OTP" on public.admin_otp_verifications
  for all using (auth.role() = 'service_role');

-- 2) Function to clean up expired OTPs (run periodically or on insert)
create or replace function public.cleanup_expired_otps()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.admin_otp_verifications
  where expires_at < now() or verified = true;
$$;

-- 3) Rate limit check: max 5 OTPs per 10 minutes per user
create or replace function public.check_otp_rate_limit(p_user_id uuid)
returns table (allowed boolean, retry_after_seconds integer)
language sql
security definer
set search_path = public
as $$
  with recent_count as (
    select count(*) as cnt
    from public.admin_otp_verifications
    where user_id = p_user_id
      and created_at > now() - interval '10 minutes'
  ),
  oldest_recent as (
    select min(created_at) as oldest
    from public.admin_otp_verifications
    where user_id = p_user_id
      and created_at > now() - interval '10 minutes'
  )
  select
    case when rc.cnt < 5 then true
         else false
    end as allowed,
    case when rc.cnt < 5 then 0
         else extract(epoch from (ol.oldest + interval '10 minutes' - now()))::integer
    end as retry_after_seconds
  from recent_count rc, oldest_recent ol;
$$;

-- 4) Function to verify OTP
create or replace function public.verify_admin_otp(
  p_user_id uuid,
  p_otp_code text
)
returns table (success boolean, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record record;
  v_attempts integer;
begin
  -- Clean up expired OTPs first
  perform public.cleanup_expired_otps();

  -- Find the most recent unverified OTP for this user
  select id, otp_code, expires_at into v_record
  from public.admin_otp_verifications
  where user_id = p_user_id
    and verified = false
    and expires_at > now()
  order by created_at desc
  limit 1;

  if v_record is null then
    return query select false, 'No valid OTP found. Please request a new one.';
    return;
  end if;

  -- Check attempt count (reuse column as attempt counter by checking verification attempts)
  -- For simplicity, we check if too many wrong attempts happened recently
  select count(*) into v_attempts
  from public.admin_otp_verifications
  where user_id = p_user_id
    and verified = false
    and created_at > now() - interval '5 minutes';

  if v_attempts > 10 then
    return query select false, 'Too many failed attempts. Please request a new OTP.';
    return;
  end if;

  -- Verify the OTP
  if v_record.otp_code = p_otp_code then
    update public.admin_otp_verifications
    set verified = true
    where id = v_record.id;
    return query select true, 'OTP verified successfully.';
  else
    return query select false, 'Invalid OTP code. Please try again.';
  end if;
end;
$$;
