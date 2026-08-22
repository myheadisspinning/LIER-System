-- Secure RPC for residents to update their own profile fields.
--
-- Background:
--   public_users has RLS policies for "owner read own" and "superadmin manage"
--   but NO owner-update policy. The previous frontend "Update Personal Info"
--   silently updated 0 rows (RLS blocked it without returning an error).
--
--   Instead of adding a permissive "owner update own" policy (which would
--   expose role/avatar_url to self-modification via direct API calls), this
--   RPC whitelists only the safe columns.
--
-- Usage:
--   - saveProfile calls with all 8 fields
--   - saveEmergencyContact calls with only the 3 EC fields (others null)
--   - Nullable args use coalesce(arg, existing) so only passed fields change
--
-- Security:
--   - security definer bypasses RLS
--   - targets row by auth.uid() only (no p_user_id param)
--   - only whitelisted columns can be written
--   - fullname validated non-empty if provided

drop function if exists public.update_own_profile(text, date, text, text, text, text, text, text);

create or replace function public.update_own_profile(
  p_fullname text default null,
  p_dob date default null,
  p_gender text default null,
  p_address text default null,
  p_phone text default null,
  p_ec_name text default null,
  p_ec_rel text default null,
  p_ec_phone text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_fullname is not null and trim(p_fullname) = '' then
    raise exception 'Full name cannot be empty.';
  end if;

  if not exists (select 1 from public.public_users where id = auth.uid()) then
    raise exception 'Profile not found for current user.';
  end if;

  update public.public_users
  set
    fullname = coalesce(nullif(trim(p_fullname), ''), fullname),
    dob = coalesce(p_dob, dob),
    gender = coalesce(p_gender, gender),
    address = coalesce(p_address, address),
    phone = coalesce(p_phone, phone),
    emergency_contact_name = coalesce(p_ec_name, emergency_contact_name),
    emergency_contact_relationship = coalesce(p_ec_rel, emergency_contact_relationship),
    emergency_contact_phone = coalesce(p_ec_phone, emergency_contact_phone)
  where id = auth.uid();
end;
$$;

revoke all on function public.update_own_profile(text, date, text, text, text, text, text, text) from public;
grant execute on function public.update_own_profile(text, date, text, text, text, text, text, text) to authenticated;
