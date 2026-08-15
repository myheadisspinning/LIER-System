create trigger trg_incident_status_timestamps
  before insert or update on public.incident_reports
  for each row execute function public.incident_status_timestamps()