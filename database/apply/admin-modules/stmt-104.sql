-- Add committee and icon columns to officials
alter table public.officials add column if not exists committee text;
alter table public.officials add column if not exists icon text default 'person';
