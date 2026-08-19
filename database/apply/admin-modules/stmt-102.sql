drop policy if exists "broadcasts storage public read" on storage.objects;
create policy "broadcasts storage public read" on storage.objects
  for select using (bucket_id = 'broadcasts');
