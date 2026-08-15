create policy "staff manage report archives" on public.report_archives
  for all using (public.is_staff())