import Ph from '../../../components/PhIcon';
import { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { getAdminProfile } from '../../../lib/admin';
import Toast from '../../../components/Toast';

type PasswordForm = {
  current: string;
  newPass: string;
  confirm: string;
};

export default function OfficerAccountSettings() {
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [unitName, setUnitName] = useState('');
  const [unitType, setUnitType] = useState('');
  const [authProvider, setAuthProvider] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCoarsePointer, setIsCoarsePointer] = useState(() => window.matchMedia('(pointer: coarse)').matches);

  const [pw, setPw] = useState<PasswordForm>({ current: '', newPass: '', confirm: '' });
  const [showFields, setShowFields] = useState<Record<keyof PasswordForm, boolean>>({ current: false, newPass: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isEmailProvider = authProvider === 'email';

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const handler = (e: MediaQueryListEvent) => setIsCoarsePointer(e.matches);
    setIsCoarsePointer(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const profile = await getAdminProfile();
      setFullname(profile.fullname);
      setEmail(user?.email ?? profile.email ?? '');
      setAuthProvider((user as unknown as { app_metadata?: { provider?: string } }).app_metadata?.provider ?? 'email');

      if (profile.id) {
        const res = await supabase.from('dispatch_units').select('name, type').eq('lead_officer_id', profile.id).maybeSingle();
        setUnitName((res.data?.name as string | undefined) ?? '');
        setUnitType((res.data?.type as string | undefined) ?? '');
      }
      setLoading(false);
    })();
  }, []);

  const updatePassword = async () => {
    if (!isEmailProvider) return;
    if (!pw.current || !pw.newPass) {
      setToast({ type: 'error', message: 'Please fill in all password fields.' });
      return;
    }
    if (pw.newPass.length < 8) {
      setToast({ type: 'error', message: 'New password must be at least 8 characters.' });
      return;
    }
    if (pw.newPass !== pw.confirm) {
      setToast({ type: 'error', message: 'New passwords do not match.' });
      return;
    }
    setPwSaving(true);
    const { error: reAuthError } = await supabase.auth.signInWithPassword({
      email,
      password: pw.current,
    });
    if (reAuthError) {
      setPwSaving(false);
      setToast({ type: 'error', message: 'Current password is incorrect.' });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: pw.newPass });
    setPwSaving(false);
    if (error) {
      setToast({ type: 'error', message: `Failed to update password: ${error.message}` });
    } else {
      setPw({ current: '', newPass: '', confirm: '' });
      setToast({ type: 'success', message: 'Password updated successfully.' });
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6">,

      {loading ? (
        <div className="p-6 sm:p-10 text-center text-sm text-on-surface-variant">Loading account settings…</div>
      ) : (
        <>
          <div className="bg-surface-container-lowest border border-border-subtle rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 relative overflow-hidden text-center sm:text-left">
            <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-surface-container/50 to-transparent pointer-events-none"></div>
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 min-w-0 flex-1 relative z-10">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-secondary text-on-secondary flex items-center justify-center text-2xl font-bold border-4 border-surface-container-lowest overflow-hidden shrink-0">
                {fullname.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'O'}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-on-surface break-words">{fullname}</h3>
                <p className="text-sm text-on-surface-variant break-all mt-0.5">{email}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary/10 text-secondary border border-secondary/20 rounded-full font-label-sm text-label-sm">
                    <Ph className="text-[14px]" name="admin_panel_settings" />
                    Duty Officer
                  </span>
                  {unitName && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-success-green/10 text-success-green border border-success-green/20 rounded-full font-label-sm text-label-sm">
                      <Ph className="text-[14px]" name="shield_person" />
                      {unitName} · {unitType}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-success-green/10 text-success-green border border-success-green/20 rounded-full font-label-sm text-label-sm relative z-10">
              <div className="w-1.5 h-1.5 rounded-full bg-success-green"></div>
              Account Active
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl border border-border-subtle p-4 sm:p-6">
            <div className="mb-4 sm:mb-6">
              <h3 className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-1">Security</h3>
              <h2 className="text-lg font-headline-md sm:text-headline-md text-on-surface">Password & Authentication</h2>
            </div>

            {isEmailProvider ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-3">
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-1">Current Password</label>
                    <div className="relative">
                      <input
                        className="w-full bg-surface-bg border border-border-subtle rounded pl-3 pr-10 py-1.5 sm:py-2 text-body-sm font-body-sm focus:ring-1 focus:ring-secondary focus:border-secondary transition-all"
                        placeholder="••••••••"
                        type={showFields.current ? 'text' : 'password'}
                        value={pw.current}
                        onChange={(e) => setPw({ ...pw, current: e.target.value })}
                      />
                      {pw.current && (
                        <button
                          type="button"
                          onClick={() => setShowFields((s) => ({ ...s, current: !s.current }))}
                          className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-outline hover:text-on-surface transition-colors"
                          aria-label={showFields.current ? 'Hide password' : 'Show password'}
                        >
                          <Ph name={showFields.current ? 'visibility_off' : 'visibility'} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-1">New Password</label>
                    <div className="relative">
                      <input
                        className="w-full bg-surface-bg border border-border-subtle rounded pl-3 pr-10 py-1.5 sm:py-2 text-body-sm font-body-sm focus:ring-1 focus:ring-secondary focus:border-secondary transition-all"
                        placeholder="At least 8 characters"
                        type={showFields.newPass ? 'text' : 'password'}
                        value={pw.newPass}
                        onChange={(e) => setPw({ ...pw, newPass: e.target.value })}
                      />
                      {pw.newPass && (
                        <button
                          type="button"
                          onClick={() => setShowFields((s) => ({ ...s, newPass: !s.newPass }))}
                          className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-outline hover:text-on-surface transition-colors"
                          aria-label={showFields.newPass ? 'Hide password' : 'Show password'}
                        >
                          <Ph name={showFields.newPass ? 'visibility_off' : 'visibility'} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-1">Confirm New Password</label>
                    <div className="relative">
                      <input
                        className="w-full bg-surface-bg border border-border-subtle rounded pl-3 pr-10 py-1.5 sm:py-2 text-body-sm font-body-sm focus:ring-1 focus:ring-secondary focus:border-secondary transition-all"
                        placeholder="••••••••"
                        type={showFields.confirm ? 'text' : 'password'}
                        value={pw.confirm}
                        onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                      />
                      {pw.confirm && (
                        <button
                          type="button"
                          onClick={() => setShowFields((s) => ({ ...s, confirm: !s.confirm }))}
                          className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-outline hover:text-on-surface transition-colors"
                          aria-label={showFields.confirm ? 'Hide password' : 'Show password'}
                        >
                          <Ph name={showFields.confirm ? 'visibility_off' : 'visibility'} />
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={updatePassword}
                    disabled={pwSaving}
                    className="mt-3 inline-flex items-center gap-2 bg-secondary text-on-secondary font-label-md text-label-md py-2 px-5 rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-60"
                  >
                    <Ph className="text-[18px]" name="lock_reset" />
                    {pwSaving ? 'Updating…' : 'Update Password'}
                  </button>
                </div>
                <div className="space-y-4 md:pl-6 md:border-l border-border-subtle">
                  <div>
                    <h4 className="font-label-md text-label-md text-on-surface mb-2">Active Sessions</h4>
                    <div className="bg-surface-bg border border-border-subtle rounded-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between gap-2">
                        <span className="font-label-sm text-label-sm text-on-surface flex items-center gap-2">
                          <Ph className="text-[18px] text-secondary" name="devices" />
                          Signed-In Devices
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success-green/10 text-success-green border border-success-green/25 text-[10px] font-bold uppercase tracking-wider">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-green opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success-green"></span>
                          </span>
                          Online
                        </span>
                      </div>
                      <div className="p-3 sm:p-4 flex items-center gap-3">
                        <div className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${isCoarsePointer ? 'bg-secondary/10 text-secondary' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                          <Ph className="text-[22px]" name={isCoarsePointer ? 'smartphone' : 'desktop_windows'} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-label-sm text-label-sm text-on-surface">{isCoarsePointer ? 'Mobile Device' : 'Desktop Device'}</div>
                          <div className="text-xs text-on-surface-variant mt-0.5">This browser · {isCoarsePointer ? 'Touch screen' : 'Pointer & keyboard'}</div>
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-success-green shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-success-green"></span>
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-surface-bg border border-border-subtle rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Ph className="text-success-green text-xl" name="verified_user" />
                      <span className="font-label-md text-label-md text-on-surface">Password Sign-In</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Your account uses an email and password. Change it regularly and never share your credentials.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-surface-bg border border-border-subtle rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Ph className="text-secondary text-xl" name="shield" />
                  <span className="font-label-md text-label-md text-on-surface">External Sign-In Account</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Your account uses an external provider. Password management is handled by that provider.</p>
              </div>
            )}
          </div>
        </>
      )}

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}