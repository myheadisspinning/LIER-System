import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getRole, dashboardPathFor } from '../lib/role';
import LoadingScreen from './LoadingScreen';

export default function HomeGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      if (!user) {
        if (mounted) setStatus('ready');
        return;
      }

      const role = await getRole(user.id);
      if (!mounted) return;

      if (role === 'user') setStatus('ready');
      else navigate(dashboardPathFor(role), { replace: true });
    };

    check();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (status !== 'ready') return <LoadingScreen message="Checking access..." />;
  return <>{children}</>;
}