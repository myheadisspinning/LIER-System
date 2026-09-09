-- Realtime: publish live changes to clients.
-- Run in the Supabase SQL Editor, or enable under Settings -> API -> Realtime
-- (Database -> Replication) for these tables.
-- Idempotent: only adds tables that are NOT already members of the
-- supabase_realtime publication (safe to re-run).
-- Realtime respects RLS, so clients only receive rows they can read.
--
-- This is the single authoritative source for which tables are realtime.
-- It supersedes officer-realtime/stmt-001.sql and presence-realtime/stmt-001.sql
-- (those are kept for reference but you only need to run this one).

do $$
declare
  t text;
begin
  foreach t in array array[
    'incident_reports',
    'dispatch_units',
    'broadcasts',
    'blotters',
    'presence',
    'inquiries',
    'inquiry_messages'
  ]
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