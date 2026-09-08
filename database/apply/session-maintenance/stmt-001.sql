-- session-maintenance.sql
-- Adds session control (per-user logout, logout-all) and a system
-- maintenance flag for the Admin/Superadmin portals. Idempotent.
--
-- Run statement-by-statement (Supabase SQL Editor / CLI db query cannot
-- run multi-statement files). See database/apply/ convention.

-- ------------------------------------------------------------------
-- 1) system_settings: singleton config row (maintenance_mode flag)
-- ------------------------------------------------------------------
create table if not exists public.system_settings (
  id boolean primary key default true check (id = true),
  maintenance_mode boolean not null default false,
  updated_at timestamptz default now(),
  updated_by uuid
);

insert into public.system_settings (id, maintenance_mode)
values (true, false)
on conflict (id) do nothing;

alter table public.system_settings enable row level security;

drop policy if exists "system_settings writable by superadmin" on public.system_settings;
create policy "system_settings writable by superadmin" on public.system_settings
  for all using (public.is_superadmin()) with check (public.is_superadmin());

-- ------------------------------------------------------------------
-- 2) get_maintenance_mode: read the flag (any authenticated/anonymous
--    caller so pre-login pages can show a maintenance screen)
-- ------------------------------------------------------------------
create or replace function public.get_maintenance_mode()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((select s.maintenance_mode from public.system_settings s where s.id), false);
$$;

revoke all on function public.get_maintenance_mode() from public;
grant execute on function public.get_maintenance_mode() to anon;
grant execute on function public.get_maintenance_mode() to authenticated;

-- ------------------------------------------------------------------
-- 3) admin_set_maintenance: enable/disable maintenance mode
-- ------------------------------------------------------------------
create or replace function public.admin_set_maintenance(
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor text;
begin
  if not public.is_superadmin() then
    raise exception 'Forbidden';
  end if;

  insert into public.system_settings (id, maintenance_mode, updated_by)
  values (true, p_enabled, auth.uid())
  on conflict (id)
  do update set maintenance_mode = excluded.maintenance_mode,
                updated_at = now(),
                updated_by = excluded.updated_by;

  select coalesce((select fullname from public.public_users where id = auth.uid()), 'Superadmin')
  into v_actor;

  insert into public.ai_audit_logs (actor, action, detail, metadata)
  values (
    v_actor,
    'System maintenance',
    case when p_enabled then 'Enabled maintenance mode' else 'Disabled maintenance mode' end,
    jsonb_build_object('maintenance_mode', p_enabled)
  );
end;
$$;

revoke all on function public.admin_set_maintenance(boolean) from public;
grant execute on function public.admin_set_maintenance(boolean) to authenticated;

-- ------------------------------------------------------------------
-- 4) admin_logout_user: sign a single user out of all sessions
-- ------------------------------------------------------------------
create or replace function public.admin_logout_user(
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor text;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  if exists (
    select 1 from public.public_users where id = p_user_id and role = 'superadmin'
  ) and not public.is_superadmin() then
    raise exception 'Cannot log out a superadmin account.';
  end if;

  delete from auth.sessions where user_id = p_user_id;

  -- Mark them offline in the presence feed immediately.
  insert into public.presence (user_id, last_seen_at)
  values (p_user_id, '1970-01-01T00:00:00Z')
  on conflict (user_id)
  do update set last_seen_at = excluded.last_seen_at;

  select coalesce((select fullname from public.public_users where id = auth.uid()), 'Admin')
  into v_actor;

  insert into public.ai_audit_logs (actor, action, detail, metadata)
  values (
    v_actor,
    'Logout user',
    format('Signed out user %s on all devices', p_user_id),
    jsonb_build_object('user_id', p_user_id)
  );
end;
$$;

revoke all on function public.admin_logout_user(uuid) from public;
grant execute on function public.admin_logout_user(uuid) to authenticated;

-- ------------------------------------------------------------------
-- 5) admin_logout_others: sign out every other user across the portals
--    (keeps the caller's own session). Returns the number of sessions
--    that were ended.
-- ------------------------------------------------------------------
create or replace function public.admin_logout_others()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor text;
  v_count integer;
begin
  if not public.is_superadmin() then
    raise exception 'Forbidden';
  end if;

  delete from auth.sessions
  where user_id <> auth.uid();
  get diagnostics v_count = row_count;

  -- Take everyone else offline in the presence feed.
  update public.presence
  set last_seen_at = '1970-01-01T00:00:00Z'
  where user_id <> auth.uid();

  select coalesce((select fullname from public.public_users where id = auth.uid()), 'Superadmin')
  into v_actor;

  insert into public.ai_audit_logs (actor, action, detail, metadata)
  values (
    v_actor,
    'Logout all users',
    format('Terminated %s active session(s) across all users', v_count),
    jsonb_build_object('sessions_ended', v_count)
  );

  return v_count;
end;
$$;

revoke all on function public.admin_logout_others() from public;
grant execute on function public.admin_logout_others() to authenticated;