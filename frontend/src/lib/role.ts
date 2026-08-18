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

export interface AccessCheck {
  allowed: boolean;
  reason: 'deleted' | 'suspended' | 'ok';
}

export async function checkUserAccess(userId: string): Promise<AccessCheck> {
  const { data } = await supabase.rpc('check_user_access', { p_user_id: userId }).maybeSingle();
  if (!data || !data.user_exists) return { allowed: false, reason: 'deleted' };
  if (data.is_suspended) return { allowed: false, reason: 'suspended' };
  return { allowed: true, reason: 'ok' };
}

export function dashboardPathFor(role: Role): string {
  if (role === 'superadmin') return '/superadmin/dashboard';
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'officer') return '/officer/dashboard';
  return '/user/dashboard';
}
