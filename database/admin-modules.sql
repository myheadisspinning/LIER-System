-- admin-modules.sql
-- Adds the tables, RLS policies, RPCs, and triggers that power the
-- admin portal modules (Officials, Broadcasts/Notifications, Contacts
-- Inbox, Blotters, Reports Archives, Tanod/officer linkage, Account
-- Settings) plus the officer responder flow. Idempotent (safe to re-run).
--
-- NOTE: apply statement-by-statement (Supabase CLI db query cannot run
-- multi-statement files). See database/apply/admin-modules/ for the split.

-- ------------------------------------------------------------------
-- 1) public_users.suspended (blocks sign-in for suspended accounts)
-- ------------------------------------------------------------------
alter table public.public_users
  add column if not exists suspended boolean not null default false;

-- ------------------------------------------------------------------
-- 2) dispatch_units.lead_officer_id (links an officer account to a unit)
-- ------------------------------------------------------------------
alter table public.dispatch_units
  add column if not exists lead_officer_id uuid references public.public_users (id) on delete set null;

-- ------------------------------------------------------------------
-- 3) incident_reports status/assignment timestamps (SLA + analytics)
-- ------------------------------------------------------------------
alter table public.incident_reports
  add column if not exists status_updated_at timestamptz;

alter table public.incident_reports
  add column if not exists assigned_at timestamptz;

alter table public.incident_reports
  add column if not exists resolved_at timestamptz;

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
$$;

drop trigger if exists trg_incident_status_timestamps on public.incident_reports;
create trigger trg_incident_status_timestamps
  before insert or update on public.incident_reports
  for each row execute function public.incident_status_timestamps();

-- ------------------------------------------------------------------
-- 4) officials (admin Officials MGMT + public /officials page)
-- ------------------------------------------------------------------
create table if not exists public.officials (
  id uuid primary key default extensions.gen_random_uuid(),
  fullname text not null,
  title text not null,
  term text,
  phone text,
  email text,
  photo_url text,
  facebook text,
  office_hours text,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

alter table public.officials enable row level security;

drop policy if exists "officials public read visible" on public.officials;
create policy "officials public read visible" on public.officials
  for select using (visible);

drop policy if exists "staff manage officials" on public.officials;
create policy "staff manage officials" on public.officials
  for all using (public.is_staff());

-- ------------------------------------------------------------------
-- 5) broadcasts (admin Status Notifications + user Advisories)
-- ------------------------------------------------------------------
create table if not exists public.broadcasts (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null,
  message text not null,
  type text not null default 'Announcement'
    check (type in ('Advisory', 'Alert', 'Announcement', 'Weather', 'Emergency')),
  audience text not null default 'Everyone',
  status text not null default 'Draft'
    check (status in ('Draft', 'Scheduled', 'Sent')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid references public.public_users (id) on delete set null,
  created_at timestamptz default now()
);

alter table public.broadcasts enable row level security;

drop policy if exists "broadcasts public read sent" on public.broadcasts;
create policy "broadcasts public read sent" on public.broadcasts
  for select using (status = 'Sent');

drop policy if exists "staff manage broadcasts" on public.broadcasts;
create policy "staff manage broadcasts" on public.broadcasts
  for all using (public.is_staff());

-- Optional image attachment for broadcasts
alter table public.broadcasts add column if not exists image_url text;

-- Storage bucket for broadcast images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'broadcasts',
  'broadcasts',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
) on conflict (id) do update set public = true;

drop policy if exists "broadcasts storage public read" on storage.objects;
create policy "broadcasts storage public read" on storage.objects
  for select using (bucket_id = 'broadcasts');

drop policy if exists "broadcasts storage authenticated write" on storage.objects;
create policy "broadcasts storage authenticated write" on storage.objects
  for all to authenticated
  using (bucket_id = 'broadcasts')
  with check (bucket_id = 'broadcasts');

-- ------------------------------------------------------------------
-- 6) inquiries + inquiry_messages (admin Contacts Inbox)
-- ------------------------------------------------------------------
create table if not exists public.inquiries (
  id uuid primary key default extensions.gen_random_uuid(),
  sender_name text not null,
  sender_email text,
  sender_phone text,
  subject text not null,
  message text not null,
  status text not null default 'Open'
    check (status in ('Open', 'In Progress', 'Resolved', 'Closed')),
  created_by uuid references public.public_users (id) on delete set null,
  incident_id uuid references public.incident_reports (id) on delete set null,
  created_at timestamptz default now()
);

alter table public.inquiries enable row level security;

drop policy if exists "inquiries public insert" on public.inquiries;
create policy "inquiries public insert" on public.inquiries
  for insert with check (true);

drop policy if exists "inquiries owner read" on public.inquiries;
create policy "inquiries owner read" on public.inquiries
  for select using (auth.uid() = created_by);

drop policy if exists "staff manage inquiries" on public.inquiries;
create policy "staff manage inquiries" on public.inquiries
  for all using (public.is_staff());

create table if not exists public.inquiry_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries (id) on delete cascade,
  sender_role text not null default 'resident'
    check (sender_role in ('resident', 'staff')),
  sender_name text not null,
  message text not null,
  created_at timestamptz default now()
);

alter table public.inquiry_messages enable row level security;

drop policy if exists "inquiry messages staff all" on public.inquiry_messages;
create policy "inquiry messages staff all" on public.inquiry_messages
  for all using (public.is_staff());

drop policy if exists "inquiry messages owner read" on public.inquiry_messages;
create policy "inquiry messages owner read" on public.inquiry_messages
  for select using (
    exists (
      select 1 from public.inquiries i
      where i.id = inquiry_id and i.created_by = auth.uid()
    )
  );

-- residents reply to their own inquiry threads (send permission)
drop policy if exists "inquiry messages owner insert" on public.inquiry_messages;
create policy "inquiry messages owner insert" on public.inquiry_messages
  for insert with check (
    exists (
      select 1 from public.inquiries i
      where i.id = inquiry_id and i.created_by = auth.uid()
    )
  );

-- 6b) unread-tracking for inquiries (unread badges on the sidebar)
--     resident_last_read_at / staff_last_read_at record when each side last
--     viewed the thread. Unread means the other side has a newer message
--     (or, for staff, the inquiry is still Open).
alter table public.inquiries
  add column if not exists resident_last_read_at timestamptz;

alter table public.inquiries
  add column if not exists staff_last_read_at timestamptz;

-- Returns unread conversation counts for the calling user.
--   user_unread  : resident threads with a staff reply they haven't seen
--   admin_unread : staff view of Open threads + unseen resident replies
--                  (only returned to staff; 0 for residents)
create or replace function public.get_unread_counts()
returns table (user_unread bigint, admin_unread bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    (
      select count(distinct m.inquiry_id)
      from inquiry_messages m
      join inquiries i on i.id = m.inquiry_id
      where i.created_by = auth.uid()
        and m.sender_role = 'staff'
        and m.created_at > coalesce(i.resident_last_read_at, i.created_at)
    )::bigint as user_unread,
    case when public.is_staff() then
      (
        select count(distinct i.id)
        from inquiries i
        where i.status = 'Open'
           or (i.status not in ('Resolved', 'Closed')
               and exists (
                 select 1 from inquiry_messages m
                 where m.inquiry_id = i.id
                   and m.sender_role = 'resident'
                   and m.created_at > coalesce(i.staff_last_read_at, i.created_at)
               ))
      )::bigint
    else 0 end as admin_unread;
end;
$$;

-- Marks the calling user's side as having read the inbox: staff mark all
-- inquiries, residents mark their own threads (bypasses the owner-read-only
-- RLS policy on public.inquiries).
create or replace function public.mark_inquiries_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_staff() then
    update public.inquiries set staff_last_read_at = now();
  else
    update public.inquiries
    set resident_last_read_at = now()
    where created_by = auth.uid();
  end if;
end;
$$;

revoke all on function public.get_unread_counts() from public;
grant execute on function public.get_unread_counts() to authenticated;

revoke all on function public.mark_inquiries_read() from public;
grant execute on function public.mark_inquiries_read() to authenticated;

-- 6a) presence (online / last-seen for portal heartbeat)
--     Heartbeat upserts own row every 30s; online = last_seen_at within ~60s.
--     user_name/role are denormalized snapshots so clients can read them
--     without joining public_users (which is RLS-scoped per owner).
create table if not exists public.presence (
  user_id uuid primary key references public.public_users (id) on delete cascade,
  user_name text not null default 'User',
  role text not null default 'user',
  last_seen_at timestamptz not null default now()
);

alter table public.presence enable row level security;

drop policy if exists "presence read all" on public.presence;
create policy "presence read all" on public.presence
  for select using (auth.role() = 'authenticated');

drop policy if exists "presence own all" on public.presence;
create policy "presence own all" on public.presence
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- admins resolve resident identity/contact inside the Contacts Inbox
drop policy if exists "staff read public_users" on public.public_users;
create policy "staff read public_users" on public.public_users
  for select using (public.is_admin());

-- ------------------------------------------------------------------
-- 7) blotters (Lupon / baranggay blotter tracking)
-- ------------------------------------------------------------------
create sequence if not exists public.blotter_seq start 1;

create table if not exists public.blotters (
  id uuid primary key default extensions.gen_random_uuid(),
  blotter_no text,
  complainant_name text not null,
  respondent_name text not null,
  type text not null default 'Property Dispute',
  description text,
  incident_date date,
  status text not null default 'Filed'
    check (status in ('Filed', 'Scheduled', 'Mediation', 'Settled', 'Escalated', 'Closed')),
  assigned_lupon text,
  hearing_logs jsonb not null default '[]'::jsonb,
  created_by uuid references public.public_users (id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.blotters enable row level security;

drop policy if exists "staff manage blotters" on public.blotters;
create policy "staff manage blotters" on public.blotters
  for all using (public.is_staff());

create or replace function public.set_blotter_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.blotter_no is null then
    new.blotter_no := 'BLTR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.blotter_seq')::text, 3, '0');
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_set_blotter_no on public.blotters;
create trigger trg_set_blotter_no
  before insert or update on public.blotters
  for each row execute function public.set_blotter_no();

-- ------------------------------------------------------------------
-- 8) report_archives (saved analytics snapshots / CSV history)
-- ------------------------------------------------------------------
create table if not exists public.report_archives (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null,
  report_type text not null default 'Monthly Summary',
  period_label text,
  data jsonb not null default '{}'::jsonb,
  created_by uuid references public.public_users (id) on delete set null,
  created_at timestamptz default now()
);

alter table public.report_archives enable row level security;

drop policy if exists "staff manage report archives" on public.report_archives;
create policy "staff manage report archives" on public.report_archives
  for all using (public.is_staff());

-- ------------------------------------------------------------------
-- 9) storage bucket for official photos
-- ------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'officials',
  'officials',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
on conflict (id) do update set public = true;

drop policy if exists "officials photos public read" on storage.objects;
create policy "officials photos public read" on storage.objects
  for select using (bucket_id = 'officials');

drop policy if exists "officials photos authenticated upload" on storage.objects;
create policy "officials photos authenticated upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'officials');

-- ------------------------------------------------------------------
-- 10) Auth-admin RPCs (Account Settings, User Control, Admin Mgmt)
-- ------------------------------------------------------------------

-- Scoped directory listing for account management pages:
--   p_scope = 'residents' -> role 'user'              (Admin Account Settings, Superadmin User Control)
--   p_scope = 'staff'     -> admin/officer/superadmin (Superadmin Admin Management; superadmin only)
--   p_scope = 'all'       -> everything
-- Staff may list residents; only a superadmin may list staff accounts.
drop function if exists public.admin_list_users(text);

create or replace function public.admin_list_users(p_scope text default 'all')
returns table (
  id uuid,
  email text,
  fullname text,
  role text,
  email_confirmed_at timestamptz,
  created_at timestamptz,
  suspended boolean,
  phone text,
  address text,
  dob date,
  gender text,
  avatar_url text,
  emergency_contact_name text,
  emergency_contact_relationship text,
  emergency_contact_phone text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Forbidden';
  end if;
  if p_scope = 'staff' and not public.is_superadmin() then
    raise exception 'Forbidden';
  end if;
  if p_scope not in ('all', 'staff', 'residents') then
    raise exception 'Invalid scope';
  end if;
  return query
    select
      u.id,
      u.email::text as email,
      coalesce(p.fullname, 'Unknown Resident') as fullname,
      coalesce(p.role, 'user') as role,
      u.email_confirmed_at,
      u.created_at,
      coalesce(p.suspended, false) as suspended,
      p.phone,
      p.address,
      p.dob,
      p.gender,
      coalesce(
        p.avatar_url,
        nullif(u.raw_user_meta_data ->> 'avatar_url', ''),
        nullif(u.raw_user_meta_data ->> 'picture', '')
      ) as avatar_url,
      p.emergency_contact_name,
      p.emergency_contact_relationship,
      p.emergency_contact_phone
    from auth.users u
    left join public.public_users p on p.id = u.id
    where
      (public.is_superadmin() or coalesce(p.role, 'user') <> 'superadmin')
      and (
        p_scope = 'all'
        or (p_scope = 'staff' and coalesce(p.role, 'user') in ('admin', 'officer', 'superadmin'))
        or (p_scope = 'residents' and coalesce(p.role, 'user') = 'user')
      )
    order by u.created_at desc;
end;
$$;

create or replace function public.admin_create_user(
  p_email text,
  p_password text,
  p_fullname text,
  p_role text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_actor text;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  if p_role not in ('user', 'officer', 'admin', 'superadmin') then
    raise exception 'Invalid role';
  end if;
  if p_role = 'superadmin' and not public.is_superadmin() then
    raise exception 'Only a superadmin may create a superadmin account.';
  end if;
  if exists (select 1 from auth.users where email = lower(p_email)) then
    raise exception 'An account with that email already exists.';
  end if;

  v_id := extensions.gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role,
    email, encrypted_password,
    email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_id,
    'authenticated', 'authenticated',
    lower(p_email),
    extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('role', p_role, 'fullname', p_fullname),
    now(), now(), '', '', '', ''
  );

  insert into public.public_users (id, fullname, role)
  values (v_id, p_fullname, p_role)
  on conflict (id) do nothing;

  select coalesce((select fullname from public.public_users where id = auth.uid()), 'Admin')
  into v_actor;

  insert into public.ai_audit_logs (actor, action, detail, metadata)
  values (
    v_actor,
    'Create account',
    format('Created %s account for %s', p_role, lower(p_email)),
    jsonb_build_object('user_id', v_id, 'role', p_role)
  );

  return v_id;
end;
$$;

create or replace function public.admin_set_role(
  p_user_id uuid,
  p_role text
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
  if p_role not in ('user', 'officer', 'admin', 'superadmin') then
    raise exception 'Invalid role';
  end if;
  if exists (
    select 1 from public.public_users where id = p_user_id and role = 'superadmin'
  ) and not public.is_superadmin() then
    raise exception 'Cannot modify a superadmin account.';
  end if;
  if p_role = 'superadmin' and not public.is_superadmin() then
    raise exception 'Only a superadmin may grant superadmin.';
  end if;

  insert into public.public_users (id, fullname, role)
  values (p_user_id, 'Unknown Resident', p_role)
  on conflict (id) do update set role = excluded.role;

  select coalesce((select fullname from public.public_users where id = auth.uid()), 'Admin')
  into v_actor;

  insert into public.ai_audit_logs (actor, action, detail, metadata)
  values (
    v_actor,
    'Change role',
    format('Changed role to %s for user %s', p_role, p_user_id),
    jsonb_build_object('user_id', p_user_id, 'role', p_role)
  );
end;
$$;

create or replace function public.admin_reset_password(
  p_user_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tmp text;
  v_actor text;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  if exists (
    select 1 from public.public_users where id = p_user_id and role = 'superadmin'
  ) and not public.is_superadmin() then
    raise exception 'Cannot modify a superadmin account.';
  end if;

  v_tmp := 'Tmp' || (floor(random() * 900000) + 100000)::int::text || '!';
  update auth.users
  set encrypted_password = extensions.crypt(v_tmp, extensions.gen_salt('bf', 10)),
      updated_at = now()
  where id = p_user_id;

  select coalesce((select fullname from public.public_users where id = auth.uid()), 'Admin')
  into v_actor;

  insert into public.ai_audit_logs (actor, action, detail, metadata)
  values (
    v_actor,
    'Reset password',
    format('Reset password for user %s', p_user_id),
    jsonb_build_object('user_id', p_user_id)
  );

  return v_tmp;
end;
$$;

create or replace function public.admin_suspend_user(
  p_user_id uuid,
  p_suspended boolean
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
    raise exception 'Cannot modify a superadmin account.';
  end if;

  insert into public.public_users (id, fullname, role)
  values (p_user_id, 'Unknown Resident', 'user')
  on conflict (id) do update set suspended = excluded.suspended;

  select coalesce((select fullname from public.public_users where id = auth.uid()), 'Admin')
  into v_actor;

  insert into public.ai_audit_logs (actor, action, detail, metadata)
  values (
    v_actor,
    case when p_suspended then 'Suspend user' else 'Unsuspend user' end,
    format('%s user %s', case when p_suspended then 'Suspended' else 'Unsuspended' end, p_user_id),
    jsonb_build_object('user_id', p_user_id, 'suspended', p_suspended)
  );
end;
$$;

-- expose RPCs to authenticated clients only
revoke all on function public.admin_list_users(text) from public;
grant execute on function public.admin_list_users(text) to authenticated;

revoke all on function public.admin_create_user(text, text, text, text) from public;
grant execute on function public.admin_create_user(text, text, text, text) to authenticated;

revoke all on function public.admin_set_role(uuid, text) from public;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

revoke all on function public.admin_reset_password(uuid) from public;
grant execute on function public.admin_reset_password(uuid) to authenticated;

revoke all on function public.admin_suspend_user(uuid, boolean) from public;
grant execute on function public.admin_suspend_user(uuid, boolean) to authenticated;

revoke all on function public.admin_update_user(uuid, text, text, text, date, text) from public;
grant execute on function public.admin_update_user(uuid, text, text, text, date, text) to authenticated;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- ------------------------------------------------------------------
-- 10b) ai_audit_logs: allow staff to write audit entries from the app
--      (frontend logAudit() inserts directly; only staff may write)
-- ------------------------------------------------------------------
drop policy if exists "staff insert audit logs" on public.ai_audit_logs;
create policy "staff insert audit logs" on public.ai_audit_logs
  for insert to authenticated with check (public.is_staff());

-- ------------------------------------------------------------------
-- 10c) dispatch_units.area + duty_days (Tanod duty scheduling: a
--      responder is Available when on duty that day AND not currently
--      assigned to an open incident; dispatched via the terminal ->
--      En Route / On Scene; incident Resolved -> back to Available).
--      duty_days uses JS getDay() numbering: 0=Sun ... 6=Sat.
-- ------------------------------------------------------------------
alter table public.dispatch_units
  add column if not exists area text,
  add column if not exists duty_days integer[] not null default '{0,1,2,3,4,5,6}';

-- seed patrol area for existing units (idempotent by name)
update public.dispatch_units d
set area = v.area
from (values
  ('Tanod Patrol Unit 2', 'Purok 6'),
  ('Tanod Patrol Unit 5', 'Luzon Ave'),
  ('Tanod Patrol Unit 1', 'Barangay Hall'),
  ('BFP Engine T-04', 'BFP Culiat Station'),
  ('Medical Ambulance M-02', 'Quezon City General Hospital'),
  ('Mobile Alpha (PNP)', 'QC Station 3')
) as v(name, area)
where d.name = v.name;

-- 10d) dispatch_units.manual_status: nullable manual override. NULL = Auto
--      (status derived from duty roster + live dispatch/resolution);
--      a value here overrides the derived status until set back to Auto.
alter table public.dispatch_units
  add column if not exists manual_status text
    check (manual_status in ('Available', 'En Route', 'On Scene', 'Busy', 'Off-Duty'));

-- 10e) is_email_registered: checks if an email already has an auth account.
--      Used by the public signup page to reject duplicate emails up front,
--      because GoTrue deliberately returns a fake user (no error) for
--      existing accounts when email confirmations are enabled
--      (anti user-enumeration).
create or replace function public.is_email_registered(p_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from auth.users where email = lower(p_email)
  );
$$;

-- ------------------------------------------------------------------
-- 10f) admin_update_user: update user profile fields (fullname, phone,
--      address, dob, gender). Cannot change email or role.
--      Logs changes to audit log.
-- ------------------------------------------------------------------
create or replace function public.admin_update_user(
  p_user_id uuid,
  p_fullname text,
  p_phone text,
  p_address text,
  p_dob date,
  p_gender text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor text;
  v_old_record public.public_users;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  
  -- Get old record for audit log
  select * into v_old_record from public.public_users where id = p_user_id;
  if not found then
    raise exception 'User not found';
  end if;
  
  -- Cannot modify superadmin accounts unless caller is superadmin
  if v_old_record.role = 'superadmin' and not public.is_superadmin() then
    raise exception 'Cannot modify a superadmin account.';
  end if;
  
  -- Update the user profile
  update public.public_users
  set fullname = p_fullname,
      phone = p_phone,
      address = p_address,
      dob = p_dob,
      gender = p_gender
  where id = p_user_id;
  
  -- Get actor name for audit log
  select coalesce((select fullname from public.public_users where id = auth.uid()), 'Admin')
  into v_actor;
  
  -- Log the update
  insert into public.ai_audit_logs (actor, action, detail, metadata)
  values (
    v_actor,
    'Update user',
    format('Updated profile for user %s', p_user_id),
    jsonb_build_object(
      'user_id', p_user_id,
      'old_fullname', v_old_record.fullname,
      'new_fullname', p_fullname,
      'old_phone', v_old_record.phone,
      'new_phone', p_phone,
      'old_address', v_old_record.address,
      'new_address', p_address,
      'old_dob', v_old_record.dob,
      'new_dob', p_dob,
      'old_gender', v_old_record.gender,
      'new_gender', p_gender
    )
  );
end;
$$;

-- ------------------------------------------------------------------
-- 10g) admin_delete_user: delete user from auth.users (cascades to
--      public_users). Logs deletion to audit log.
-- ------------------------------------------------------------------
create or replace function public.admin_delete_user(
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor text;
  v_user_record public.public_users;
  v_email text;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  
  -- Get user record before deletion
  select * into v_user_record from public.public_users where id = p_user_id;
  if not found then
    raise exception 'User not found';
  end if;
  
  -- Get email from auth.users
  select email into v_email from auth.users where id = p_user_id;
  
  -- Cannot delete superadmin accounts unless caller is superadmin
  if v_user_record.role = 'superadmin' and not public.is_superadmin() then
    raise exception 'Cannot delete a superadmin account.';
  end if;
  
  -- Delete from auth.users (cascades to public_users)
  delete from auth.users where id = p_user_id;
  
  -- Get actor name for audit log
  select coalesce((select fullname from public.public_users where id = auth.uid()), 'Admin')
  into v_actor;
  
  -- Log the deletion
  insert into public.ai_audit_logs (actor, action, detail, metadata)
  values (
    v_actor,
    'Delete user',
    format('Deleted user %s (%s)', p_user_id, v_email),
    jsonb_build_object(
      'user_id', p_user_id,
      'email', v_email,
      'fullname', v_user_record.fullname,
      'role', v_user_record.role
    )
  );
end;
$$;

-- ------------------------------------------------------------------
-- 11) Verify
-- ------------------------------------------------------------------
select 'officials' as tbl, count(*) from public.officials
union all select 'broadcasts', count(*) from public.broadcasts
union all select 'inquiries', count(*) from public.inquiries
union all select 'inquiry_messages', count(*) from public.inquiry_messages
union all select 'blotters', count(*) from public.blotters
union all select 'report_archives', count(*) from public.report_archives;

-- ------------------------------------------------------------------
-- 11b) Storage bucket for community gallery images
-- ------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community_gallery',
  'community_gallery',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
) on conflict (id) do update set public = true;

drop policy if exists "gallery storage public read" on storage.objects;
create policy "gallery storage public read" on storage.objects
  for select using (bucket_id = 'community_gallery');

drop policy if exists "gallery storage authenticated write" on storage.objects;
create policy "gallery storage authenticated write" on storage.objects
  for all to authenticated
  using (bucket_id = 'community_gallery')
  with check (bucket_id = 'community_gallery');

-- ------------------------------------------------------------------
-- 12) Community Gallery (homepage carousel images)
-- ------------------------------------------------------------------
create table if not exists public.community_gallery (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text not null,
  sort_order integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.community_gallery enable row level security;

drop policy if exists "gallery public read" on public.community_gallery;
create policy "gallery public read" on public.community_gallery
  for select using (visible = true);

drop policy if exists "gallery staff manage" on public.community_gallery;
create policy "gallery staff manage" on public.community_gallery
  for all using (public.is_staff()) with check (public.is_staff());

-- Seed default carousel items (local paths used as initial fallback;
-- run scripts/migrate-gallery-to-storage.js to upload to Supabase Storage)
insert into public.community_gallery (title, image_url, sort_order, visible) values
  ('Local Toda Drivers Patrol Training', '/image/tandangsora.jfif', 1, true),
  ('Zone 4 Tree Planting Event', '/image/tandangsorashrine.jpg', 2, true),
  ('Salaam Compound Health Fair', '/image/barangayhalltandangsora.jfif', 3, true),
  ('Community Clean-Up Drive', '/image/tandangsora.jpg', 4, true),
  ('Barangay Safety Orientation', '/image/culiat-brgy.jpg', 5, true)
on conflict do nothing;

-- ------------------------------------------------------------------
-- 12b) Home Section Images (editable images for homepage sections)
-- ------------------------------------------------------------------
create table if not exists public.home_section_images (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  slot_key text not null,
  label text not null,
  image_url text not null,
  updated_at timestamptz not null default now(),
  unique (section, slot_key)
);

alter table public.home_section_images enable row level security;

drop policy if exists "home_section_images public read" on public.home_section_images;
create policy "home_section_images public read" on public.home_section_images
  for select using (true);

drop policy if exists "home_section_images staff manage" on public.home_section_images;
create policy "home_section_images staff manage" on public.home_section_images
  for all using (public.is_staff()) with check (public.is_staff());

insert into public.home_section_images (section, slot_key, label, image_url) values
  ('services', 'report_incident', 'Report an Incident', '/image/culiat-brgy.jpg'),
  ('services', 'emergency_hotline', 'Emergency Hotline', '/image/tandangsora.jfif'),
  ('services', 'police_assistance', 'Police Assistance', '/image/barangayhalltandangsora.jfif'),
  ('services', 'contact_barangay', 'Contact Barangay', '/image/tandangsorashrine.jpg'),
  ('guides', 'elders_guide', 'Elders'' Guide: Navigating the Portal', '/image/culiat-brgy.jpg'),
  ('guides', 'safety_protocols', 'Public Safety & Protocols', '/image/tandangsora.jfif'),
  ('guides', 'resilient_community', 'Building a Resilient Community', '/image/tandangsorashrine.jpg')
on conflict (section, slot_key) do update set image_url = excluded.image_url;

-- ------------------------------------------------------------------
-- 13) Resident self-service profile update (RPC)
-- ------------------------------------------------------------------
-- Secure RPC for residents to update their own profile fields.
-- public_users has RLS policies for "owner read own" and "superadmin manage"
-- but NO owner-update policy. Instead of adding a permissive update policy
-- (which would expose role/avatar_url to self-modification), this RPC
-- whitelists only the safe columns. Nullable args use coalesce(arg, existing)
-- so only passed fields change.
drop function if exists public.update_own_profile(text, date, text, text, text, text, text, text);

create or replace function public.update_own_profile(
  p_fullname text default null,
  p_dob date default null,
  p_gender text default null,
  p_address text default null,
  p_phone text default null,
  p_ec_name text default null,
  p_ec_rel text default null,
  p_ec_phone text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_fullname is not null and trim(p_fullname) = '' then
    raise exception 'Full name cannot be empty.';
  end if;

  if not exists (select 1 from public.public_users where id = auth.uid()) then
    raise exception 'Profile not found for current user.';
  end if;

  update public.public_users
  set
    fullname = coalesce(nullif(trim(p_fullname), ''), fullname),
    dob = coalesce(p_dob, dob),
    gender = coalesce(p_gender, gender),
    address = coalesce(p_address, address),
    phone = coalesce(p_phone, phone),
    emergency_contact_name = coalesce(p_ec_name, emergency_contact_name),
    emergency_contact_relationship = coalesce(p_ec_rel, emergency_contact_relationship),
    emergency_contact_phone = coalesce(p_ec_phone, emergency_contact_phone)
  where id = auth.uid();
end;
$$;

revoke all on function public.update_own_profile(text, date, text, text, text, text, text, text) from public;
grant execute on function public.update_own_profile(text, date, text, text, text, text, text, text) to authenticated;
