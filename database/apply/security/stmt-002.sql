-- security-ratelimit stmt-002: ip_bans table
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