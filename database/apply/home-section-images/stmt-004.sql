drop policy if exists "home_section_images staff manage" on public.home_section_images;
create policy "home_section_images staff manage" on public.home_section_images
  for all using (public.is_staff()) with check (public.is_staff());
