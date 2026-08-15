create trigger trg_set_blotter_no
  before insert or update on public.blotters
  for each row execute function public.set_blotter_no()