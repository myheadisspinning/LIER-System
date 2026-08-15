-- ai-models.sql
-- Run in the Supabase SQL Editor (supabase.com -> SQL Editor -> New query).
-- Adds the AI dispatch data model: incident reports, dispatch units,
-- AI config, fallback rules, and audit logs. Idempotent (safe to re-run).

-- ------------------------------------------------------------------
-- 0) Helper predicates (extends public_users role model)
-- ------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.public_users where id = auth.uid() and role in ('admin', 'superadmin')
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.public_users where id = auth.uid() and role in ('admin', 'officer', 'superadmin')
  );
$$;

-- ------------------------------------------------------------------
-- 1) dispatch_units (must exist before incident_reports references it)
-- ------------------------------------------------------------------
create table if not exists public.dispatch_units (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  type text not null default 'Tanod' check (type in ('Tanod', 'BFP', 'Medical', 'PNP', 'Barangay')),
  status text not null default 'Available' check (status in ('Available', 'En Route', 'On Scene', 'Busy', 'Off-Duty')),
  lat double precision,
  lng double precision,
  last_location text,
  created_at timestamptz default now()
);

alter table public.dispatch_units enable row level security;

drop policy if exists "units readable by all" on public.dispatch_units;
create policy "units readable by all" on public.dispatch_units
  for select using (true);

drop policy if exists "staff manage units" on public.dispatch_units;
create policy "staff manage units" on public.dispatch_units
  for all using (public.is_admin());

-- ------------------------------------------------------------------
-- 2) incident_reports
-- ------------------------------------------------------------------
create table if not exists public.incident_reports (
  id uuid primary key default extensions.gen_random_uuid(),
  report_no text,
  user_id uuid references auth.users (id) on delete set null,
  title text not null,
  description text,
  category text not null default 'Others',
  priority text not null default 'MEDIUM' check (priority in ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  threat integer not null default 0 check (threat between 0 and 100),
  confidence integer not null default 0 check (confidence between 0 and 100),
  status text not null default 'Pending' check (status in ('Pending', 'Verifying', 'Assigned', 'Progress', 'Resolved', 'Rejected')),
  incident_status text not null default 'Ongoing' check (incident_status in ('Ongoing', 'Happened', 'Unconfirmed')),
  lat double precision,
  lng double precision,
  address text,
  reporter_confidence text,
  ai_actions jsonb not null default '[]'::jsonb,
  ai_dispatch text,
  dispatch_unit_id uuid references public.dispatch_units (id) on delete set null,
  created_at timestamptz default now()
);

alter table public.incident_reports enable row level security;

drop policy if exists "users read own reports" on public.incident_reports;
create policy "users read own reports" on public.incident_reports
  for select using (auth.uid() = user_id);

drop policy if exists "users insert own reports" on public.incident_reports;
create policy "users insert own reports" on public.incident_reports
  for insert with check (auth.uid() = user_id);

drop policy if exists "staff read all reports" on public.incident_reports;
create policy "staff read all reports" on public.incident_reports
  for select using (public.is_staff());

drop policy if exists "staff update reports" on public.incident_reports;
create policy "staff update reports" on public.incident_reports
  for update using (public.is_staff());

-- incident_time + evidence (real submitted time / uploaded files metadata)
alter table public.incident_reports add column if not exists incident_time timestamptz;
alter table public.incident_reports add column if not exists evidence jsonb default '[]'::jsonb;
alter table public.incident_reports add column if not exists additional_context text;

-- ------------------------------------------------------------------
-- 2b) evidence storage bucket (public; images/video/audio up to 50MB)
-- ------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence',
  'evidence',
  true,
  52428800,
  array['image/png', 'image/jpeg', 'video/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'image/jpg']
)
on conflict (id) do update set public = true;

drop policy if exists "evidence public read" on storage.objects;
create policy "evidence public read" on storage.objects
  for select using (bucket_id = 'evidence');

drop policy if exists "evidence upload by authenticated" on storage.objects;
create policy "evidence upload by authenticated" on storage.objects
  for insert to authenticated with check (bucket_id = 'evidence');

drop policy if exists "evidence manage by authenticated" on storage.objects;
create policy "evidence manage by authenticated" on storage.objects
  for update using (bucket_id = 'evidence') with check (bucket_id = 'evidence');

-- ------------------------------------------------------------------
-- 3) ai_config (key/value, value is jsonb)
-- ------------------------------------------------------------------
create table if not exists public.ai_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

alter table public.ai_config enable row level security;

drop policy if exists "config readable by all" on public.ai_config;
create policy "config readable by all" on public.ai_config
  for select using (true);

drop policy if exists "superadmin write config" on public.ai_config;
create policy "superadmin write config" on public.ai_config
  for all using (public.is_superadmin());

-- ------------------------------------------------------------------
-- 4) fallback_rules (keyword rule engine used when Gemini is off/fails)
-- ------------------------------------------------------------------
create table if not exists public.fallback_rules (
  id uuid primary key default extensions.gen_random_uuid(),
  keywords text[] not null,
  category text not null,
  action text not null default 'Dispatch',
  priority text not null default 'MEDIUM' check (priority in ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  enabled boolean not null default true,
  created_at timestamptz default now()
);

alter table public.fallback_rules enable row level security;

drop policy if exists "rules readable by all" on public.fallback_rules;
create policy "rules readable by all" on public.fallback_rules
  for select using (true);

drop policy if exists "superadmin manage rules" on public.fallback_rules;
create policy "superadmin manage rules" on public.fallback_rules
  for all using (public.is_superadmin());

-- ------------------------------------------------------------------
-- 5) ai_audit_logs
-- ------------------------------------------------------------------
create table if not exists public.ai_audit_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  actor text not null default 'AI_System',
  action text not null,
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.ai_audit_logs enable row level security;

drop policy if exists "staff read audit logs" on public.ai_audit_logs;
create policy "staff read audit logs" on public.ai_audit_logs
  for select using (public.is_staff());

-- ------------------------------------------------------------------
-- 6) auto report_no (REP-0001 style)
-- ------------------------------------------------------------------
create sequence if not exists public.report_seq start 1;

create or replace function public.set_report_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.report_no is null then
    new.report_no := 'REP-' || lpad(nextval('public.report_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_report_no on public.incident_reports;
create trigger trg_set_report_no
  before insert on public.incident_reports
  for each row execute function public.set_report_no();

-- ------------------------------------------------------------------
-- 7) Seed defaults (idempotent)
-- ------------------------------------------------------------------
insert into public.ai_config (key, value) values
  ('ai_enabled', '{"enabled": true}'),
  ('model', '{"name": "gemini-flash-latest"}'),
  ('max_tokens', '{"value": 1024}'),
  ('temperature', '{"value": 0.1}'),
  ('auto_dispatch_threshold', '{"value": 95}'),
  ('critical_threshold', '{"value": 85}'),
  ('low_confidence_routing', '{"mode": "Force Manual Triage"}'),
  ('max_dispatch_timeout', '{"value": 30}'),
  ('audit_level', '{"level": "Verbose"}'),
  ('pii_redaction', '{"enabled": true}')
on conflict (key) do nothing;

-- dedupe (keeps earliest per name), then seed only if missing
delete from public.dispatch_units a
using public.dispatch_units b
where a.name = b.name and a.id <> b.id and a.created_at > b.created_at;

insert into public.dispatch_units (name, type, status, lat, lng, last_location, area, duty_days)
select v.name, v.type, v.status, v.lat, v.lng, v.last_location, v.area, v.duty_days
from (values
  ('Tanod Patrol Unit 2', 'Tanod', 'Available', 14.7135, 121.0638, 'Purok 6, Barangay Culiat', 'Purok 6', '{0,1,2,3,4,5,6}'::integer[]),
  ('Tanod Patrol Unit 5', 'Tanod', 'Busy', 14.7102, 121.0671, 'Luzon Ave, Barangay Culiat', 'Luzon Ave', '{0,1,2,3,4,5,6}'::integer[]),
  ('Tanod Patrol Unit 1', 'Tanod', 'Off-Duty', 14.7160, 121.0599, 'Barangay Hall', 'Barangay Hall', '{0,1,2,3,4,5,6}'::integer[]),
  ('BFP Engine T-04', 'BFP', 'Available', 14.7118, 121.0660, 'BFP Culiat Station', 'BFP Culiat Station', '{0,1,2,3,4,5,6}'::integer[]),
  ('Medical Ambulance M-02', 'Medical', 'Available', 14.7091, 121.0623, 'Quezon City General Hospital', 'Quezon City General Hospital', '{0,1,2,3,4,5,6}'::integer[]),
  ('Mobile Alpha (PNP)', 'PNP', 'Available', 14.7152, 121.0700, 'QC Station 3', 'QC Station 3', '{0,1,2,3,4,5,6}'::integer[])
) as v(name, type, status, lat, lng, last_location, area, duty_days)
where not exists (select 1 from public.dispatch_units d where d.name = v.name);

-- dedupe fallback rules (keeps earliest per keyword set), then seed if missing
delete from public.fallback_rules a
using public.fallback_rules b
where a.keywords = b.keywords and a.id <> b.id and a.created_at > b.created_at;

-- remove previous seed rows (blended Filipino/English), then reseed with expanded 16-rule set
delete from public.fallback_rules
where keywords in (
  array['stolen', 'missing', 'theft', 'robbery', 'nakaw'],
  array['fire', 'smoke', 'sunog', 'apoy'],
  array['knife', 'weapon', 'armed', 'threat', 'pananakot', 'kutsilyo'],
  array['wound', 'bleed', 'unconscious', 'injured', 'sugatan'],
  array['loud', 'noise', 'disturbance', 'ingay', 'away'],
  array['flood', 'trap', 'landslide', 'baha'],
  array['nakaw', 'ninakaw', 'ninanakaw', 'magnanakaw', 'pagnanakaw', 'holdap', 'snatcher', 'mandurukot'],
  array['sunog', 'apoy', 'nasusunog', 'nagliliyab', 'usok', 'nagniningas'],
  array['kutsilyo', 'patalim', 'baril', 'armas', 'pananakot', 'nananakot', 'tinatakot'],
  array['sugatan', 'nasugatan', 'dugo', 'dumudugo', 'walang malay', 'himatay', 'nasaktan', 'atake'],
  array['ingay', 'maingay', 'away', 'gulo', 'sigawan', 'sumisigaw'],
  array['baha', 'bumaha', 'pagbaha', 'pagguho', 'gumuho', 'natabunan'],
  array['saksak', 'saksakin', 'saksakan', 'sinaksak', 'nasaksak', 'pananaksak', 'pamamaril', 'namaril', 'barilin', 'binaril', 'stab', 'stabbing', 'stabbed', 'shoot', 'shooting', 'shot', 'gunshot'],
  array['gulpi', 'ginulpi', 'binugbog', 'bugbog', 'bugbugan', 'suntukan', 'suntok', 'sinalakay', 'maul', 'mauling', 'assault', 'attacked'],
  array['patay', 'pinatay', 'patayan', 'pumatay', 'nasawi', 'natagpuang patay', 'kill', 'killed', 'murder', 'homicide', 'dead body', 'namatay'],
  array['bangkay', 'natagpuang bangkay', 'cadaver', 'deceased', 'patay na tao', 'walang buhay'],
  array['dinukot', 'nangikidnap', 'kinarnap', 'kidnap', 'kidnapping', 'abducted', 'carnap', 'carnapping', 'hijack'],
  array['droga', 'ipinagbabawal na gamot', 'drugs', 'drug', 'shabu', 'pusher'],
  array['basag', 'sinira', 'vandalism', 'vandal', 'riot', 'kaguluhan', 'nagkagulo'],
  array['sinunog', 'sinusunog', 'panununog', 'arson'],
  array['pagsabog', 'sumabog', 'bomba', 'tagas ng gas', 'gasolina', 'nakuryente', 'kuryente', 'explosion', 'exploded', 'bomb', 'blast', 'gas leak', 'gas', 'fuel', 'gasoline', 'short circuit', 'electrical fire'],
  array['aksidente', 'naaksidente', 'nabangga', 'nasagasaan', 'nakabangga', 'nahulog', 'nahulugan', 'nalunod', 'nalulunod', 'nalason', 'pagkalason', 'lason', 'accident', 'vehicular accident', 'hit and run', 'fell', 'fell down', 'drown', 'drowning', 'drowned', 'poison', 'poisoning', 'overdose'],
  array['kagat', 'nakagat', 'kagat ng aso', 'kagat ng ahas', 'tinuka', 'dog bite', 'snake bite', 'bite', 'buntis', 'manganganak', 'nanganganak', 'nanganak', 'pregnant', 'labor', 'giving birth', 'hika', 'atake ng hika', 'asthma'],
  array['lindol', 'earthquake', 'bagyo', 'storm', 'brownout', 'power outage', 'no electricity', 'walang kuryente', 'traffic', 'traffic jam', 'fallen tree', 'natumba na puno', 'bumagsak na puno']
);

insert into public.fallback_rules (keywords, category, action, priority)
select v.keywords, v.category, v.action, v.priority
from (values
  (array['nakaw', 'ninakaw', 'ninanakaw', 'magnanakaw', 'pagnanakaw', 'holdap', 'snatcher', 'mandurukot', 'stolen', 'theft', 'robbery', 'missing', 'stole', 'shoplifting', 'burglary'], 'Crime', 'Dispatch', 'HIGH'),
  (array['saksak', 'saksakin', 'saksakan', 'sinaksak', 'nasaksak', 'pananaksak', 'pamamaril', 'namaril', 'barilin', 'binaril', 'stab', 'stabbing', 'stabbed', 'shoot', 'shooting', 'shot', 'gunshot', 'knife', 'weapon', 'armed', 'gun', 'baril', 'patalim', 'kutsilyo', 'armas'], 'Crime', 'Emergency', 'CRITICAL'),
  (array['gulpi', 'ginulpi', 'binugbog', 'bugbog', 'bugbugan', 'suntukan', 'suntok', 'sinalakay', 'maul', 'mauling', 'assault', 'attacked', 'brawl', 'away', 'gulo'], 'Crime', 'Dispatch', 'HIGH'),
  (array['patay', 'pinatay', 'patayan', 'pumatay', 'nasawi', 'natagpuang patay', 'kill', 'killed', 'murder', 'homicide', 'dead body', 'namatay'], 'Crime', 'Emergency', 'CRITICAL'),
  (array['bangkay', 'natagpuang bangkay', 'cadaver', 'deceased', 'patay na tao', 'walang buhay'], 'Crime', 'Emergency', 'CRITICAL'),
  (array['dinukot', 'nangikidnap', 'kinarnap', 'kidnap', 'kidnapping', 'abducted', 'carnap', 'carnapping', 'hijack'], 'Crime', 'Emergency', 'CRITICAL'),
  (array['droga', 'ipinagbabawal na gamot', 'drugs', 'drug', 'shabu', 'pusher'], 'Crime', 'Dispatch', 'HIGH'),
  (array['basag', 'sinira', 'vandalism', 'vandal', 'riot', 'kaguluhan', 'nagkagulo'], 'Crime', 'Investigate', 'MEDIUM'),
  (array['sunog', 'apoy', 'nasusunog', 'nagliliyab', 'usok', 'nagniningas', 'nagsusunog', 'fire', 'smoke', 'burning', 'flames', 'blaze'], 'Fire Hazard', 'Emergency', 'CRITICAL'),
  (array['sinunog', 'sinusunog', 'panununog', 'arson'], 'Fire Hazard', 'Emergency', 'CRITICAL'),
  (array['pagsabog', 'sumabog', 'bomba', 'tagas ng gas', 'gasolina', 'nakuryente', 'kuryente', 'explosion', 'exploded', 'bomb', 'blast', 'gas leak', 'gas', 'fuel', 'gasoline', 'short circuit', 'electrical fire'], 'Fire Hazard', 'Emergency', 'CRITICAL'),
  (array['sugatan', 'nasugatan', 'dugo', 'dumudugo', 'walang malay', 'himatay', 'nasaktan', 'atake', 'malubhang sugat', 'atake sa puso', 'high blood', 'kombulsyon', 'injured', 'wound', 'bleeding', 'unconscious', 'hurt', 'emergency', 'heart attack', 'stroke', 'seizure', 'convulsion'], 'Medical', 'Emergency', 'CRITICAL'),
  (array['aksidente', 'naaksidente', 'nabangga', 'nasagasaan', 'nakabangga', 'nahulog', 'nahulugan', 'nalunod', 'nalulunod', 'nalason', 'pagkalason', 'lason', 'accident', 'vehicular accident', 'hit and run', 'fell', 'fell down', 'drown', 'drowning', 'drowned', 'poison', 'poisoning', 'overdose'], 'Medical', 'Emergency', 'CRITICAL'),
  (array['kagat', 'nakagat', 'kagat ng aso', 'kagat ng ahas', 'tinuka', 'dog bite', 'snake bite', 'bite', 'buntis', 'manganganak', 'nanganganak', 'nanganak', 'pregnant', 'labor', 'giving birth', 'hika', 'atake ng hika', 'asthma'], 'Medical', 'Dispatch', 'HIGH'),
  (array['baha', 'bumaha', 'pagbaha', 'pagguho', 'gumuho', 'natabunan', 'lindol', 'bagyo', 'flood', 'landslide', 'earthquake', 'storm', 'collapsed', 'buried', 'heavy rain'], 'Others', 'Dispatch', 'HIGH'),
  (array['brownout', 'power outage', 'no electricity', 'walang kuryente', 'traffic', 'traffic jam', 'fallen tree', 'natumba na puno', 'bumagsak na puno'], 'Others', 'Dispatch', 'MEDIUM'),
  (array['ingay', 'maingay', 'away', 'gulo', 'sigawan', 'sumisigaw', 'loud', 'noise', 'disturbance', 'quarrel'], 'Others', 'Investigate', 'LOW')
) as v(keywords, category, action, priority)
where not exists (select 1 from public.fallback_rules f where f.keywords = v.keywords);

-- ------------------------------------------------------------------
-- 8) Verify
-- ------------------------------------------------------------------
select 'incident_reports' as tbl, count(*) from public.incident_reports
union all select 'dispatch_units', count(*) from public.dispatch_units
union all select 'ai_config', count(*) from public.ai_config
union all select 'fallback_rules', count(*) from public.fallback_rules;

-- ------------------------------------------------------------------
-- 9) Anonymous reports + duplicate-report guard
-- ------------------------------------------------------------------

-- 9a) anonymous flag (true => reporter identity visible only to superadmin)
alter table public.incident_reports
  add column if not exists anonymous boolean not null default false;

-- 9b) index to speed up duplicate checks (user + normalized title)
create index if not exists incident_reports_dupe_idx
  on public.incident_reports (user_id, lower(btrim(title)));

-- 9c) BEFORE INSERT guard: same account + same normalized title within
-- the last 24h + location within ~0.001 deg (~100 m) => reject as duplicate.
create or replace function public.prevent_duplicate_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.incident_reports r
    where r.user_id = new.user_id
      and r.created_at >= now() - interval '24 hours'
      and lower(btrim(r.title)) = lower(btrim(new.title))
      and (
        new.lat is null or new.lng is null
        or (r.lat is not null and r.lng is not null
            and abs(r.lat - new.lat) <= 0.001
            and abs(r.lng - new.lng) <= 0.001)
      )
  ) then
    raise exception 'A similar report was already submitted within the last 24 hours. Please check your existing reports before submitting a duplicate.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_duplicate_report on public.incident_reports;
create trigger trg_prevent_duplicate_report
  before insert on public.incident_reports
  for each row execute function public.prevent_duplicate_report();
