-- Grant permissions for admin_update_user and admin_delete_user
-- to authenticated users only (actual permission checks happen inside the functions)
revoke all on function public.admin_update_user(uuid, text, text, text, date, text) from public;
grant execute on function public.admin_update_user(uuid, text, text, text, date, text) to authenticated;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;
