-- ------------------------------------------------------------------
-- 11) Verify
-- ------------------------------------------------------------------
select 'officials' as tbl, count(*) from public.officials
union all select 'broadcasts', count(*) from public.broadcasts
union all select 'inquiries', count(*) from public.inquiries
union all select 'inquiry_messages', count(*) from public.inquiry_messages
union all select 'blotters', count(*) from public.blotters
union all select 'report_archives', count(*) from public.report_archives