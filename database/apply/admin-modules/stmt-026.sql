create policy "inquiries owner read" on public.inquiries
  for select using (auth.uid() = created_by)