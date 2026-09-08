-- session-maintenance.sql
-- Restores the 'officers' scope in admin_list_users so the Admin Account
-- Settings page can refresh its list (it calls p_scope 'residents' AND
-- 'officers'). Split-file versions regressed to reject 'officers', which
-- broke list refreshes after suspend/re-activate/edit (and the initial
-- load). Mirrors database/admin-modules.sql. Idempotent.

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
  if p_scope not in ('all', 'staff', 'residents', 'officers') then
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
        or (p_scope = 'officers' and coalesce(p.role, 'user') = 'officer')
      )
    order by u.created_at desc;
end;
$$;

revoke all on function public.admin_list_users(text) from public;
grant execute on function public.admin_list_users(text) to authenticated;