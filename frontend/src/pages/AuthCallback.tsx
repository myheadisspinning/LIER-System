import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getRole, dashboardPathFor, checkUserAccess } from '../lib/role';
import LoadingScreen from '../components/LoadingScreen';
import OTPVerificationModal from '../components/OTPVerificationModal';

export default function AuthCallback() {
  const navigate = useNavigate();

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpUserId, setOtpUserId] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpPhone, setOtpPhone] = useState('');
  const [otpDestination, setOtpDestination] = useState('');

  const handleOtpVerified = useCallback(() => {
    setShowOtpModal(false);
    setTimeout(() => navigate(otpDestination, { replace: true }), 1500);
  }, [navigate, otpDestination]);

  const handleOtpCancel = useCallback(() => {
    setShowOtpModal(false);
    setOtpUserId('');
    setOtpEmail('');
    setOtpPhone('');
    setOtpDestination('');
    navigate('/signin', { replace: true });
  }, [navigate]);

  const handleOtpError = useCallback(() => {}, []);

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

      if ((role === 'admin' || role === 'superadmin') && mounted) {
        const metaPhone = user.user_metadata?.phone || '';
        let phone = metaPhone;
        if (!phone) {
          const { data: profile } = await supabase
            .from('public_users')
            .select('phone')
            .eq('id', user.id)
            .maybeSingle();
          phone = profile?.phone || '';
        }
        setOtpUserId(user.id);
        setOtpEmail(email || '');
        setOtpPhone(phone);
        setOtpDestination(destination);
        setShowOtpModal(true);
        return;
      }

      if (mounted) {
        navigate(destination, { replace: true });
      }
    };

    handleCallback();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (showOtpModal) {
    return (
      <OTPVerificationModal
        userId={otpUserId}
        email={otpEmail}
        phone={otpPhone}
        onVerified={handleOtpVerified}
        onCancel={handleOtpCancel}
        onError={handleOtpError}
      />
    );
  }

  return <LoadingScreen message="Signing you in..." />;
}
