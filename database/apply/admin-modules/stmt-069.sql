create policy "officials photos authenticated upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'officials')