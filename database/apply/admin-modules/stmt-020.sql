create policy "staff manage broadcasts" on public.broadcasts
  for all using (public.is_staff())