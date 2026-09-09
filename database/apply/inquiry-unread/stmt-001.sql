  -- Rewrites get_unread_counts so unread badges equal the SUM of unread messages
  -- (the per-thread red numbers in the inbox add up to the sidebar overall count).
  -- A thread's INITIAL inquiry message counts as a resident message too, so a
  -- brand-new chat (which only inserts an `inquiries` row, not inquiry_messages)
  -- still shows as unread. Adds a per-conversation read RPC so opening ONE
  -- thread clears only ITS own number (Messenger-style).
  --
  --   user_unread  : total staff messages a resident hasn't seen across their threads
  --   admin_unread : total resident messages staff haven't seen across non-archived
  --                  threads (staff-only; 0 for residents)

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
        select count(*)
        from inquiry_messages m
        join inquiries i on i.id = m.inquiry_id
        where i.created_by = auth.uid()
          and m.sender_role = 'staff'
          and m.created_at > coalesce(i.resident_last_read_at, 'epoch'::timestamptz)
      )::bigint as user_unread,
      case when public.is_staff() then
        (
          select count(*) from (
            -- initial inquiry message (lives on inquiries.message, not inquiry_messages)
            select i.created_at as c
            from inquiries i
            where i.status not in ('Resolved', 'Closed')
              and i.created_at > coalesce(i.staff_last_read_at, 'epoch'::timestamptz)
            union all
            -- resident replies
            select m.created_at
            from inquiry_messages m
            join inquiries i on i.id = m.inquiry_id
            where i.status not in ('Resolved', 'Closed')
              and m.sender_role = 'resident'
              and m.created_at > coalesce(i.staff_last_read_at, 'epoch'::timestamptz)
          ) unseen
        )::bigint
      else 0 end as admin_unread;
  end;
  $$;

  -- Marks a SINGLE inquiry as read by the calling side (staff open one thread,
  -- residents open one of their own). Unlike mark_inquiries_read it never touches
  -- the rest of the inbox, so the other red numbers stay until opened.
  -- Security definer: public.inquiries RLS is owner-read-only, so direct updates
  -- from staff would be blocked.
  create or replace function public.mark_inquiry_read(p_inquiry_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = public
  as $$
  begin
    if public.is_staff() then
      update public.inquiries
      set staff_last_read_at = now()
      where id = p_inquiry_id;
    else
      update public.inquiries
      set resident_last_read_at = now()
      where id = p_inquiry_id and created_by = auth.uid();
    end if;
  end;
  $$;

  revoke all on function public.get_unread_counts() from public;
  grant execute on function public.get_unread_counts() to authenticated;

  revoke all on function public.mark_inquiry_read(uuid) from public;
  grant execute on function public.mark_inquiry_read(uuid) to authenticated;