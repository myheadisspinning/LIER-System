-- ------------------------------------------------------------------
-- 5) broadcasts (admin Status Notifications + user Advisories)
-- ------------------------------------------------------------------
create table if not exists public.broadcasts (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null,
  message text not null,
  type text not null default 'Announcement'
    check (type in ('Advisory', 'Alert', 'Announcement', 'Weather', 'Emergency')),
  audience text not null default 'Everyone',
  status text not null default 'Draft'
    check (status in ('Draft', 'Scheduled', 'Sent')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid references public.public_users (id) on delete set null,
  created_at timestamptz default now()
)