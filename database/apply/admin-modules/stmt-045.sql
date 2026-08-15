online = last_seen_at within ~60s.
--     user_name/role are denormalized snapshots so clients can read them
--     without joining public_users (which is RLS-scoped per owner).
create table if not exists public.presence (
  user_id uuid primary key references public.public_users (id) on delete cascade,
  user_name text not null default 'User',
  role text not null default 'user',
  last_seen_at timestamptz not null default now()
)