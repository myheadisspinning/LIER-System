import { supabase } from '../supabaseClient';

export type Role = 'user' | 'officer' | 'admin' | 'superadmin';

export const ROLE_LABEL: Record<Role, string> = {
  user: 'Resident',
  officer: 'Officer',
  admin: 'Admin',
  superadmin: 'Superadmin',
};

export async function getRole(userId: string): Promise<Role> {
  const { data, error } = await supabase
    .from('public_users')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (!error && data && (data.role === 'admin' || data.role === 'superadmin' || data.role === 'officer')) {
    return data.role;
  }
  return 'user';
}

export function dashboardPathFor(role: Role): string {
  if (role === 'superadmin') return '/superadmin/dashboard';
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'officer') return '/officer/dashboard';
  return '/user/dashboard';
}
