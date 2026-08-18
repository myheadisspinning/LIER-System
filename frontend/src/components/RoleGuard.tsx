import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getRole, checkUserAccess, type Role } from '../lib/role';
import LoadingScreen from './LoadingScreen';

interface RoleGuardProps {
  allowed: Role[];
  children: React.ReactNode;
}

export default function RoleGuard({ allowed, children }: RoleGuardProps) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'granted' | 'denied'>('loading');

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      if (!user) {
        if (mounted) navigate('/signin');
        return;
      }

      const access = await checkUserAccess(user.id);
      if (!mounted) return;

      if (!access.allowed) {
        await supabase.auth.signOut();
        const error = access.reason === 'deleted'
          ? 'Your account has been removed.'
          : 'Your account has been suspended.';
        navigate('/signin', { state: { error } });
        return;
      }

      const role = await getRole(user.id);
      if (mounted) {
        if (allowed.includes(role)) setStatus('granted');
        else navigate('/');
      }
    };

    check();
    return () => {
      mounted = false;
    };
  }, [allowed, navigate]);

  if (status !== 'granted') return <LoadingScreen message="Checking access..." />;
  return <>{children}</>;
}
