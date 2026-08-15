create policy "staff read public_users" on public.public_users
  for select using (public.is_admin())