-- ------------------------------------------------------------------
-- 6) inquiries + inquiry_messages (admin Contacts Inbox)
-- ------------------------------------------------------------------
create table if not exists public.inquiries (
  id uuid primary key default extensions.gen_random_uuid(),
  sender_name text not null,
  sender_email text,
  sender_phone text,
  subject text not null,
  message text not null,
  status text not null default 'Open'
    check (status in ('Open', 'In Progress', 'Resolved', 'Closed')),
  created_by uuid references public.public_users (id) on delete set null,
  created_at timestamptz default now()
)