-- ------------------------------------------------------------------
-- 10) Auth-admin RPCs (Account Settings, User Control, Admin Mgmt)
-- ------------------------------------------------------------------

-- Scoped directory listing for account management pages:
--   p_scope = 'residents' -> role 'user'            (Admin Account Settings, Superadmin User Control)
--   p_scope = 'staff'     -> admin/officer/superadmin (Superadmin Admin Management; superadmin only)
--   p_scope = 'all'       -> everything
-- Staff may list residents; only a superadmin may list staff accounts.
drop function if exists public.admin_list_users();

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
  gender text
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
      p.gender
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
