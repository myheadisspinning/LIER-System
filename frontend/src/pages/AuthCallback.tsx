import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getRole, dashboardPathFor, checkUserAccess } from '../lib/role';
import LoadingScreen from '../components/LoadingScreen';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const handleCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session?.user) {
        navigate('/signin');
        return;
      }

      const user = session.user;
      const email = user.email;

      if (email) {
        const { data: isDuplicate } = await supabase.rpc('check_email_duplicate', {
          p_email: email,
        });

        if (isDuplicate) {
          await supabase.rpc('cleanup_duplicate_public_user', { p_user_id: user.id });
          await supabase.auth.signOut();
          if (mounted) {
            navigate('/signin', {
              replace: true,
              state: {
                error: 'This email is already registered with a password. Please sign in with your email and password instead.',
              },
            });
          }
          return;
        }
      }

      const access = await checkUserAccess(user.id);
      if (!mounted) return;

      if (!access.allowed) {
        await supabase.auth.signOut();
        const error = access.reason === 'deleted'
          ? 'Your account has been removed.'
          : 'Your account has been suspended.';
        navigate('/signin', { replace: true, state: { error } });
        return;
      }

      const role = await getRole(user.id);
      const destination = role === 'user' ? '/' : dashboardPathFor(role);
      navigate(destination, { replace: true });
    };

    handleCallback();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  return <LoadingScreen message="Signing you in..." />;
}
