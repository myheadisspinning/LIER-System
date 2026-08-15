alter table public.incident_reports
  add column if not exists assigned_at timestamptz