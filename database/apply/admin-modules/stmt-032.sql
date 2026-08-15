create policy "inquiry messages staff all" on public.inquiry_messages
  for all using (public.is_staff())