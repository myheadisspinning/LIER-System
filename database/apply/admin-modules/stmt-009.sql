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
)