create policy "staff manage blotters" on public.blotters
  for all using (public.is_staff())