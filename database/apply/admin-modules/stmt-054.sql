create table if not exists public.blotters (
  id uuid primary key default extensions.gen_random_uuid(),
  blotter_no text,
  complainant_name text not null,
  respondent_name text not null,
  type text not null default 'Property Dispute',
  description text,
  incident_date date,
  status text not null default 'Filed'
    check (status in ('Filed', 'Scheduled', 'Mediation', 'Settled', 'Escalated', 'Closed')),
  assigned_lupon text,
  hearing_logs jsonb not null default '[]'::jsonb,
  created_by uuid references public.public_users (id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)