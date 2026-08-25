drop policy if exists "home_section_images public read" on public.home_section_images;
create policy "home_section_images public read" on public.home_section_images
  for select using (true);
