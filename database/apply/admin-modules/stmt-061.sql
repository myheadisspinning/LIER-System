-- ------------------------------------------------------------------
-- 8) report_archives (saved analytics snapshots / CSV history)
-- ------------------------------------------------------------------
create table if not exists public.report_archives (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null,
  report_type text not null default 'Monthly Summary',
  period_label text,
  data jsonb not null default '{}'::jsonb,
  created_by uuid references public.public_users (id) on delete set null,
  created_at timestamptz default now()
)