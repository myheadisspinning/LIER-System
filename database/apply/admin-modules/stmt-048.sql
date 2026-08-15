create policy "presence read all" on public.presence
  for select using (auth.role() = 'authenticated')