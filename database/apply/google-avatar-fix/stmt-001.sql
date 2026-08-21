-- Fix Google OAuth avatar_url not showing in admin account settings.
--
-- Root cause:
--   1) handle_new_user trigger only reads raw_user_meta_data->>'avatar_url',
--      but Google OAuth often stores the photo under ->>'picture'.
--   2) No backfill for users who signed up before the trigger existed.
--
-- Fix:
--   - Recreate handle_new_user to coalesce both keys.
--   - Backfill existing users from auth.users raw_user_meta_data.
--   - Harden admin_list_users RPC to coalesce live from auth metadata.

-- 1) Update the trigger function to coalesce avatar_url and picture
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.public_users (id, fullname, dob, gender, address, phone, email_confirmed_at, role, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'fullname', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      'Unknown Resident'
    ),
    nullif(new.raw_user_meta_data ->> 'dob', '')::date,
    new.raw_user_meta_data ->> 'gender',
    new.raw_user_meta_data ->> 'address',
    new.raw_user_meta_data ->> 'phone',
    new.email_confirmed_at,
    coalesce(new.raw_user_meta_data ->> 'role', 'user'),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) Backfill existing users where avatar_url is null/empty
update public.public_users p
set avatar_url = coalesce(
  nullif(u.raw_user_meta_data ->> 'avatar_url', ''),
  nullif(u.raw_user_meta_data ->> 'picture', '')
)
from auth.users u
where u.id = p.id
  and (p.avatar_url is null or p.avatar_url = '');

-- 3) Harden admin_list_users RPC to coalesce live from auth metadata
drop function if exists public.admin_list_users(text);

create or replace function public.admin_list_users(p_scope text default 'all')
returns table (
  id uuid,
  email text,
  fullname text,
  role text,
  email_confirmed_at timestamptz,
  created_at timestamptz,
  suspended boolean,
  phone text,
  address text,
  dob date,
  gender text,
  avatar_url text,
  emergency_contact_name text,
  emergency_contact_relationship text,
  emergency_contact_phone text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Forbidden';
  end if;
  if p_scope = 'staff' and not public.is_superadmin() then
    raise exception 'Forbidden';
  end if;
  if p_scope not in ('all', 'staff', 'residents') then
    raise exception 'Invalid scope';
  end if;
  return query
    select
      u.id,
      u.email::text as email,
      coalesce(p.fullname, 'Unknown Resident') as fullname,
      coalesce(p.role, 'user') as role,
      u.email_confirmed_at,
      u.created_at,
      coalesce(p.suspended, false) as suspended,
      p.phone,
      p.address,
      p.dob,
      p.gender,
      coalesce(
        p.avatar_url,
        nullif(u.raw_user_meta_data ->> 'avatar_url', ''),
        nullif(u.raw_user_meta_data ->> 'picture', '')
      ) as avatar_url,
      p.emergency_contact_name,
      p.emergency_contact_relationship,
      p.emergency_contact_phone
    from auth.users u
    left join public.public_users p on p.id = u.id
    where
      (public.is_superadmin() or coalesce(p.role, 'user') <> 'superadmin')
      and (
        p_scope = 'all'
        or (p_scope = 'staff' and coalesce(p.role, 'user') in ('admin', 'officer', 'superadmin'))
        or (p_scope = 'residents' and coalesce(p.role, 'user') = 'user')
      )
    order by u.created_at desc;
end;
$$;

revoke all on function public.admin_list_users(text) from public;
grant execute on function public.admin_list_users(text) to authenticated;
