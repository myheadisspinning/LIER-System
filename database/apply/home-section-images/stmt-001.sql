create table if not exists public.home_section_images (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  slot_key text not null,
  label text not null,
  image_url text not null,
  updated_at timestamptz not null default now(),
  unique (section, slot_key)
);
