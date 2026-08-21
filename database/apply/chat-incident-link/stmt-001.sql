alter table public.inquiries add column if not exists incident_id uuid references public.incident_reports (id) on delete set null;
