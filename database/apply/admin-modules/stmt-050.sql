create policy "presence own all" on public.presence
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id)