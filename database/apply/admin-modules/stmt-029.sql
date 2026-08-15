create table if not exists public.inquiry_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries (id) on delete cascade,
  sender_role text not null default 'resident'
    check (sender_role in ('resident', 'staff')),
  sender_name text not null,
  message text not null,
  created_at timestamptz default now()
)