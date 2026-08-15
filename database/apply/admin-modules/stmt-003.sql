-- ------------------------------------------------------------------
-- 3) incident_reports status/assignment timestamps (SLA + analytics)
-- ------------------------------------------------------------------
alter table public.incident_reports
  add column if not exists status_updated_at timestamptz