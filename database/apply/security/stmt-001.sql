-- security-ratelimit stmt-001: auth_attempt_log table
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