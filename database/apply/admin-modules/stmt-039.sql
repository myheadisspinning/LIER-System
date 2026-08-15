-- Returns unread conversation counts for the calling user.
--   user_unread  : resident threads with a staff reply they haven't seen
--   admin_unread : staff view of Open threads + unseen resident replies
--                  (only returned to staff; 0 for residents)
create or replace function public.get_unread_counts()
returns table (user_unread bigint, admin_unread bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    (
      select count(distinct m.inquiry_id)
      from inquiry_messages m
      join inquiries i on i.id = m.inquiry_id
      where i.created_by = auth.uid()
        and m.sender_role = 'staff'
        and m.created_at > coalesce(i.resident_last_read_at, i.created_at)
    )::bigint as user_unread,
    case when public.is_staff() then
      (
        select count(distinct i.id)
        from inquiries i
        where i.status = 'Open'
           or (i.status not in ('Resolved', 'Closed')
               and exists (
                 select 1 from inquiry_messages m
                 where m.inquiry_id = i.id
                   and m.sender_role = 'resident'
                   and m.created_at > coalesce(i.staff_last_read_at, i.created_at)
               ))
      )::bigint
    else 0 end as admin_unread;
end;
$$;

-- Marks the calling user's side as having read the inbox: staff mark all
-- inquiries, residents mark their own threads (bypasses the owner-read-only
-- RLS policy on public.inquiries).
create or replace function public.mark_inquiries_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_staff() then
    update public.inquiries set staff_last_read_at = now();
  else
    update public.inquiries
    set resident_last_read_at = now()
    where created_by = auth.uid();
  end if;
end;
$$