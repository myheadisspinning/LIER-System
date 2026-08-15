create policy "staff insert audit logs" on public.ai_audit_logs
  for insert to authenticated with check (public.is_staff())