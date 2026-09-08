-- Realtime: publish live changes to clients.
-- Run in the Supabase SQL Editor, or enable under Settings -> API -> Realtime
-- (Database -> Replication) for these tables.
-- Idempotent: only adds tables that are NOT already members of the
-- supabase_realtime publication (safe to re-run).
-- Realtime respects RLS, so clients only receive rows they can read.

do $$
declare
  t text;
begin
  foreach t in array array['incident_reports', 'dispatch_units', 'broadcasts', 'blotters']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;