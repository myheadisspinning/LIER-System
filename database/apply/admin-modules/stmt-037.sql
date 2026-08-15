-- 6b) unread-tracking for inquiries (unread badges on the sidebar)
--     resident_last_read_at / staff_last_read_at record when each side last
--     viewed the thread. Unread means the other side has a newer message
--     (or, for staff, the inquiry is still Open).
alter table public.inquiries
  add column if not exists resident_last_read_at timestamptz