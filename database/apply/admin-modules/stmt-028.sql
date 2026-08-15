create policy "staff manage inquiries" on public.inquiries
  for all using (public.is_staff())