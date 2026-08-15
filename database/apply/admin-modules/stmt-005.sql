alter table public.incident_reports
  add column if not exists resolved_at timestamptz