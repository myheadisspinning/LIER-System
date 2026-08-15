create or replace function public.set_blotter_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.blotter_no is null then
    new.blotter_no := 'BLTR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.blotter_seq')::text, 3, '0');
  end if;
  new.updated_at := now();
  return new;
end;
$$