-- ai-user-actions / stmt-001
-- Adds user_actions jsonb to incident_reports. Stores the user-facing
-- recommended actions from the AI tactical analysis shown during reporting.
-- These are the "Recommended Actions for You" that users see in the
-- AI Tactical Analysis panel on the ReportIncident page.
-- Readable by the report owner and admins/officers/superadmin.
alter table public.incident_reports add column if not exists user_actions jsonb default '[]'::jsonb;
