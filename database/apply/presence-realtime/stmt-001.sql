-- Realtime: publish live presence (last_seen_at) changes to clients
-- so the Admin "Online" column updates as heartbeats land, instead of
-- relying on polling.
-- Run in the Supabase SQL Editor, or enable under Settings -> API -> Realtime
-- (Database -> Replication) for the presence table.
-- Idempotent: only adds tables that are NOT already members of the
-- supabase_realtime publication (safe to re-run).
-- Realtime respects RLS, so clients only receive rows they can read.

do $$
declare
  t text;
begin
  foreach t in array array['presence']
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