create policy "inquiry messages owner insert" on public.inquiry_messages
  for insert with check (
    exists (
      select 1 from public.inquiries i
      where i.id = inquiry_id and i.created_by = auth.uid()
    )
  )