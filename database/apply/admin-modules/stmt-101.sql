-- ------------------------------------------------------------------
-- Storage bucket for broadcast images
-- ------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'broadcasts',
  'broadcasts',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
) on conflict (id) do update set public = true;
