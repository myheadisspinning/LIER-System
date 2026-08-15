incident Resolved -> back to Available).
--      duty_days uses JS getDay() numbering: 0=Sun ... 6=Sat.
-- ------------------------------------------------------------------
alter table public.dispatch_units
  add column if not exists area text,
  add column if not exists duty_days integer[] not null default '{0,1,2,3,4,5,6}'