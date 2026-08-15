create policy "staff manage officials" on public.officials
  for all using (public.is_staff())