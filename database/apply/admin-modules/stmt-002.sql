-- ------------------------------------------------------------------
-- 2) dispatch_units.lead_officer_id (links an officer account to a unit)
-- ------------------------------------------------------------------
alter table public.dispatch_units
  add column if not exists lead_officer_id uuid references public.public_users (id) on delete set null