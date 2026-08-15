create policy "inquiry messages owner read" on public.inquiry_messages
  for select using (
    exists (
      select 1 from public.inquiries i
      where i.id = inquiry_id and i.created_by = auth.uid()
    )
  )