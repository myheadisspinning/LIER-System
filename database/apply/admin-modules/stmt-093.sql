--      a value here overrides the derived status until set back to Auto.
alter table public.dispatch_units
  add column if not exists manual_status text
    check (manual_status in ('Available', 'En Route', 'On Scene', 'Busy', 'Off-Duty'))