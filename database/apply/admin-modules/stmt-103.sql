drop policy if exists "broadcasts storage authenticated write" on storage.objects;
create policy "broadcasts storage authenticated write" on storage.objects
  for all to authenticated
  using (bucket_id = 'broadcasts')
  with check (bucket_id = 'broadcasts');
