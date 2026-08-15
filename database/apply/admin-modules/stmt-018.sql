create policy "broadcasts public read sent" on public.broadcasts
  for select using (status = 'Sent')