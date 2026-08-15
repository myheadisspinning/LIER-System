create or replace function public.incident_status_timestamps()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.status <> old.status then
      new.status_updated_at := now();
    end if;
    if new.dispatch_unit_id is distinct from old.dispatch_unit_id and new.dispatch_unit_id is not null then
      new.assigned_at := coalesce(new.assigned_at, now());
    end if;
    if new.status = 'Resolved' and old.status <> 'Resolved' then
      new.resolved_at := coalesce(new.resolved_at, now());
    end if;
  end if;
  return new;
end;
$$