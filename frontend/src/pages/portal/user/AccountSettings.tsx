import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import Toast from '../../../components/Toast';
import ConfirmDialog from '../../../components/ConfirmDialog';

type UserProfile = {
  fullname: string;
  dob: string;
  gender: string;
  address: string;
  phone: string;
  email: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
  avatar_url: string | null;
};

type Preferences = {
  urgent_broadcasts: boolean;
  case_progress: boolean;
  announcements: boolean;
  siren_alerts: boolean;
  gps_access: boolean;
  anonymous_reporting: boolean;
};

type PasswordForm = {
  current: string;
  newPass: string;
  confirm: string;
};

function Toggle({ checked, onChange, accent = 'bg-secondary' }: { checked: boolean; onChange: (v: boolean) => void; accent?: string }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={() => onChange(!checked)} className="sr-only peer" />
      <div
        className={`w-11 h-6 rounded-full peer transition-colors ${checked ? accent : 'bg-surface-variant'} after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full`}
      ></div>
    </label>
  );
}

const inputClass =
  'w-full pl-9 pr-3 py-2 bg-surface-bg border border-border-subtle rounded-lg text-body-sm font-body-sm focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-shadow';

const RELATIONSHIPS = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'child', label: 'Child' },
  { value: 'friend', label: 'Friend' },
];

export default function AccountSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState('');
  const [authProvider, setAuthProvider] = useState('');

  const [profile, setProfile] = useState<UserProfile>({
    fullname: '', dob: '', gender: '', address: '', phone: '', email: '',
    emergency_contact_name: '', emergency_contact_relationship: '', emergency_contact_phone: '',
    avatar_url: null,
  });

  const [prefs, setPrefs] = useState<Preferences>({
    urgent_broadcasts: true, case_progress: true, announcements: false, siren_alerts: true,
    gps_access: true, anonymous_reporting: false,
  });

  const [pw, setPw] = useState<PasswordForm>({ current: '', newPass: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const isEmailProvider = authProvider === 'email';

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      setUserId(user.id);
      setAuthProvider((user as unknown as { app_metadata?: { provider?: string } }).app_metadata?.provider ?? 'email');

      const [profileRes, prefsRes] = await Promise.all([
        supabase
          .from('public_users')
          .select('fullname, dob, gender, address, phone, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, avatar_url')
          .eq('id', user.id)
          .single(),
        supabase
          .from('user_preferences')
          .select('urgent_broadcasts, case_progress, announcements, siren_alerts, gps_access, anonymous_reporting')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (profileRes.data) {
        const d = profileRes.data;
        const meta = user.user_metadata as Record<string, unknown> | undefined;
        const metaAvatar = (typeof meta?.avatar_url === 'string' && meta.avatar_url) ||
          (typeof meta?.picture === 'string' && meta.picture) || null;
        setProfile({
          fullname: d.fullname || '',
          dob: d.dob || '',
          gender: d.gender || '',
          address: d.address || '',
          phone: d.phone || '',
          email: user.email || '',
          emergency_contact_name: d.emergency_contact_name || '',
          emergency_contact_relationship: d.emergency_contact_relationship || '',
          emergency_contact_phone: d.emergency_contact_phone || '',
          avatar_url: d.avatar_url || metaAvatar,
        });
      }

      if (prefsRes.data) {
        const p = prefsRes.data;
        setPrefs({
          urgent_broadcasts: p.urgent_broadcasts,
          case_progress: p.case_progress,
          announcements: p.announcements,
          siren_alerts: p.siren_alerts,
          gps_access: p.gps_access,
          anonymous_reporting: p.anonymous_reporting,
        });
      }

      setLoading(false);
    })();
  }, []);

  const saveProfile = useCallback(async () => {
    if (!userId || !profile.fullname.trim()) {
      setToast({ type: 'error', message: 'Full name is required.' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc('update_own_profile', {
      p_fullname: profile.fullname.trim(),
      p_dob: profile.dob || null,
      p_gender: profile.gender || null,
      p_address: profile.address.trim(),
      p_phone: profile.phone.trim(),
      p_ec_name: profile.emergency_contact_name.trim() || null,
      p_ec_rel: profile.emergency_contact_relationship || null,
      p_ec_phone: profile.emergency_contact_phone.trim() || null,
    });
    if (error) {
      setSaving(false);
      setToast({ type: 'error', message: `Failed to update profile: ${error.message}` });
      return;
    }
    await supabase.auth.updateUser({ data: { fullname: profile.fullname.trim() } });
    setSaving(false);
    setToast({ type: 'success', message: 'Personal info updated.' });
  }, [userId, profile]);

  const saveEmergencyContact = useCallback(async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.rpc('update_own_profile', {
      p_ec_name: profile.emergency_contact_name.trim() || null,
      p_ec_rel: profile.emergency_contact_relationship || null,
      p_ec_phone: profile.emergency_contact_phone.trim() || null,
    });
    setSaving(false);
    if (error) {
      setToast({ type: 'error', message: `Failed to save emergency contact: ${error.message}` });
    } else {
      setToast({ type: 'success', message: 'Emergency contact saved.' });
    }
  }, [userId, profile]);

  const savePreferences = useCallback(async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        { user_id: userId, ...prefs },
        { onConflict: 'user_id' },
      );
    setSaving(false);
    if (error) {
      setToast({ type: 'error', message: `Failed to save preferences: ${error.message}` });
    } else {
      setToast({ type: 'success', message: 'Preferences saved.' });
    }
  }, [userId, prefs]);

  const updatePassword = useCallback(async () => {
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
      email: profile.email,
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
  }, [isEmailProvider, pw, profile.email]);

  const handleDeactivate = useCallback(async () => {
    setDeactivateOpen(false);
    await supabase.auth.signOut();
    navigate('/');
  }, [navigate]);

  const setPref = <K extends keyof Preferences>(key: K, val: Preferences[K]) =>
    setPrefs((prev) => ({ ...prev, [key]: val }));

  const setField = <K extends keyof UserProfile>(key: K, val: UserProfile[K]) =>
    setProfile((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="w-full">
      {loading ? (
        <div className="p-10 text-center text-sm text-on-surface-variant">Loading account settings…</div>
      ) : !profile.fullname && !profile.email ? (
        <div className="p-10 text-center text-sm text-on-surface-variant">No profile data available.</div>
      ) : (
        <>
          <div className="bg-surface-container-lowest border border-border-subtle rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 mb-6 relative overflow-hidden text-center sm:text-left">
            <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-surface-container/50 to-transparent pointer-events-none"></div>
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 min-w-0 flex-1 relative z-10">
              <div className="w-20 h-20 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-headline-lg text-headline-lg shadow-md border-4 border-surface-container-lowest overflow-hidden shrink-0">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  profile.fullname.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-headline-md text-headline-md text-on-background break-words text-center sm:text-left">{profile.fullname}</h3>
                <div className="flex items-start justify-center sm:justify-start gap-1.5 mt-1 text-on-surface-variant font-body-sm text-body-sm max-w-2xl mx-auto sm:mx-0">
                  <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">location_on</span>
                  <p className="min-w-0 break-words">{profile.address || 'House No., Street, Purok/Area, Barangay Culiat'}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center sm:items-end gap-2 relative z-10">
              <div className="flex items-center gap-2 px-3 py-1 bg-success-green/10 text-success-green border border-success-green/20 rounded-full font-label-sm text-label-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-success-green"></div>
                Account Active
              </div>
              <span className="font-caps-xs text-caps-xs text-on-surface-variant">LAST UPDATED: TODAY</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-surface-container-lowest border border-border-subtle rounded-2xl shadow-sm flex flex-col h-full">
              <div className="p-6 border-b border-border-subtle bg-surface/50 rounded-t-xl">
                <h3 className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-1">Registration Data</h3>
                <h2 className="font-headline-md text-headline-md text-on-background">Personal Details</h2>
              </div>
              <div className="p-6 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  <div className="space-y-1">
                    <label className="font-label-sm text-label-sm text-on-surface-variant block">Full Name</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">person</span>
                      <input className={inputClass} type="text" value={profile.fullname} onChange={(e) => setField('fullname', e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-label-sm text-label-sm text-on-surface-variant block">Date of Birth</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">calendar_today</span>
                      <input className={inputClass} type="date" value={profile.dob} onChange={(e) => setField('dob', e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-label-sm text-label-sm text-on-surface-variant block">Gender</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">wc</span>
                      <select className={`${inputClass} appearance-none`} value={profile.gender} onChange={(e) => setField('gender', e.target.value)}>
                        <option value="">Select gender...</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">expand_more</span>
                    </div>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="font-label-sm text-label-sm text-on-surface-variant block">Registered Address</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-3 text-outline text-[18px]">home</span>
                      <textarea
                        className="w-full pl-9 pr-3 py-2 bg-surface-bg border border-border-subtle rounded-lg text-body-sm font-body-sm focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-shadow resize-none"
                        rows={2}
                        value={profile.address}
                        onChange={(e) => setField('address', e.target.value)}
                      ></textarea>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-label-sm text-label-sm text-on-surface-variant block">Mobile Number</label>
                    <div className="relative flex">
                      <span className="inline-flex items-center px-3 border border-r-0 border-border-subtle bg-surface-container rounded-l-lg text-on-surface-variant font-label-sm text-label-sm">
                        +63
                      </span>
                      <input className="flex-1 w-full px-3 py-2 bg-surface-bg border border-border-subtle rounded-r-lg text-body-sm font-body-sm focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-shadow" type="tel" value={profile.phone} onChange={(e) => setField('phone', e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-label-sm text-label-sm text-on-surface-variant block">Email Address</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">mail</span>
                      <input className={inputClass} type="email" value={profile.email} disabled />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-border-subtle bg-surface/30 rounded-b-xl flex justify-end">
                <button type="button" onClick={saveProfile} disabled={saving} className="px-4 py-2 border border-border-subtle hover:bg-surface-container text-on-surface font-label-md text-label-md rounded-lg transition-colors shadow-sm disabled:opacity-60">
                  {saving ? 'Saving…' : 'Update Personal Info'}
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 bg-surface-container-lowest border border-border-subtle rounded-2xl shadow-sm flex flex-col h-full relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-error-red"></div>
              <div className="p-6 border-b border-border-subtle bg-error-container/10 rounded-t-xl mt-1">
                <h3 className="font-caps-xs text-caps-xs text-error-red uppercase tracking-wider mb-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">emergency</span>
                  Critical Info
                </h3>
                <h2 className="font-headline-md text-headline-md text-on-background">Emergency Contact</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 leading-tight">Who should desk officers call during an emergency or SOS trigger?</p>
              </div>
              <div className="p-6 flex-1 space-y-6">
                <div className="space-y-1">
                  <label className="font-label-sm text-label-sm text-on-surface-variant block">Contact Name</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">person_alert</span>
                    <input className="w-full pl-9 pr-3 py-2 bg-surface-bg border border-border-subtle rounded-lg text-body-sm font-body-sm focus:border-error-red focus:ring-1 focus:ring-error-red outline-none transition-shadow" placeholder="e.g., Maria Dela Cruz" type="text" value={profile.emergency_contact_name} onChange={(e) => setField('emergency_contact_name', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-label-sm text-label-sm text-on-surface-variant block">Relationship to Resident</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">family_restroom</span>
                    <select className="w-full pl-9 pr-3 py-2 bg-surface-bg border border-border-subtle rounded-lg text-body-sm font-body-sm focus:border-error-red focus:ring-1 focus:ring-error-red outline-none transition-shadow appearance-none" value={profile.emergency_contact_relationship} onChange={(e) => setField('emergency_contact_relationship', e.target.value)}>
                      <option value="">Select relationship...</option>
                      {RELATIONSHIPS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">expand_more</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-label-sm text-label-sm text-on-surface-variant block">Emergency Mobile Number</label>
                  <div className="relative flex">
                    <span className="inline-flex items-center px-3 border border-r-0 border-border-subtle bg-surface-container rounded-l-lg text-on-surface-variant font-label-sm text-label-sm">
                      +63
                    </span>
                    <input className="flex-1 w-full px-3 py-2 bg-surface-bg border border-border-subtle rounded-r-lg text-body-sm font-body-sm focus:border-error-red focus:ring-1 focus:ring-error-red outline-none transition-shadow" placeholder="9XX XXX XXXX" type="tel" value={profile.emergency_contact_phone} onChange={(e) => setField('emergency_contact_phone', e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-border-subtle bg-surface/30 rounded-b-xl mt-auto">
                <button type="button" onClick={saveEmergencyContact} disabled={saving} className="w-full px-4 py-3 bg-secondary hover:bg-secondary-container text-on-secondary font-label-md text-label-md font-bold rounded-lg transition-colors shadow-md flex justify-center items-center gap-2 disabled:opacity-60">
                  <span className="material-symbols-outlined text-[20px]">save</span>
                  {saving ? 'Saving…' : 'Save Emergency Contact'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl border border-border-subtle p-6 mt-6 shadow-[0_1px_2px_rgba(2,6,23,0.05)]">
            <div className="mb-3">
              <h3 className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-1">Channels</h3>
              <h2 className="font-headline-md text-headline-md text-on-surface">Notification Preferences</h2>
            </div>
            <div className="space-y-0 divide-y divide-border-subtle">
              <div className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-label-md text-label-md text-on-surface">Urgent Community Broadcasts</div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant">Receive SMS and push alerts for critical barangay emergencies.</div>
                </div>
                <Toggle checked={prefs.urgent_broadcasts} onChange={(v) => setPref('urgent_broadcasts', v)} />
              </div>
              <div className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-label-md text-label-md text-on-surface">Real-Time Case Progress Updates</div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant">Get notified when status changes on your reported incidents.</div>
                </div>
                <Toggle checked={prefs.case_progress} onChange={(v) => setPref('case_progress', v)} />
              </div>
              <div className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-label-md text-label-md text-on-surface">General Barangay Announcements</div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant">Newsletters, event schedules, and administrative updates.</div>
                </div>
                <Toggle checked={prefs.announcements} onChange={(v) => setPref('announcements', v)} />
              </div>
              <div className="py-3 flex items-center justify-between">
                <div className="flex items-start space-x-3">
                  <span className="material-symbols-outlined text-warning-amber mt-0.5">volume_up</span>
                  <div>
                    <div className="font-label-md text-label-md text-on-surface">High-Priority Siren Alerts</div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant">Play loud audible alarm for severe weather or direct threats, overriding silent mode.</div>
                  </div>
                </div>
                <Toggle checked={prefs.siren_alerts} onChange={(v) => setPref('siren_alerts', v)} accent="bg-warning-amber" />
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl border border-border-subtle p-6 mt-6 shadow-[0_1px_2px_rgba(2,6,23,0.05)]">
            <div className="mb-6">
              <h3 className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-1">Security</h3>
              <h2 className="font-headline-md text-headline-md text-on-surface">Password & Authentication</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-3">
                {isEmailProvider ? (
                  <>
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface mb-1">Current Password</label>
                      <input className="w-full bg-surface-bg border border-border-subtle rounded px-3 py-2 text-body-sm font-body-sm focus:ring-1 focus:ring-secondary focus:border-secondary transition-all" placeholder="••••••••" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
                    </div>
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface mb-1">New Password</label>
                      <input className="w-full bg-surface-bg border border-border-subtle rounded px-3 py-2 text-body-sm font-body-sm focus:ring-1 focus:ring-secondary focus:border-secondary transition-all" placeholder="••••••••" type="password" value={pw.newPass} onChange={(e) => setPw({ ...pw, newPass: e.target.value })} />
                    </div>
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface mb-1">Confirm New Password</label>
                      <input className="w-full bg-surface-bg border border-border-subtle rounded px-3 py-2 text-body-sm font-body-sm focus:ring-1 focus:ring-secondary focus:border-secondary transition-all" placeholder="••••••••" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
                    </div>
                    <button type="button" onClick={updatePassword} disabled={pwSaving} className="mt-3 bg-surface-bg border border-border-subtle text-on-surface font-label-md text-label-md py-2 px-4 rounded hover:bg-surface-container transition-colors disabled:opacity-60">
                      {pwSaving ? 'Updating…' : 'Update Password'}
                    </button>
                  </>
                ) : (
                  <div className="bg-surface-bg border border-border-subtle rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="material-symbols-outlined text-secondary text-xl">shield</span>
                      <span className="font-label-md text-label-md text-on-surface">Google Sign-In Account</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Your account uses Google Sign-In. Password management is handled by Google.</p>
                  </div>
                )}
              </div>
              <div className="space-y-6 md:pl-6 md:border-l border-border-subtle">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-label-md text-label-md text-on-surface">Two-Factor Authentication (SMS)</div>
                      <div className="font-body-sm text-body-sm text-on-surface-variant">Require a code sent to your mobile on new logins.</div>
                    </div>
                    {isEmailProvider ? (
                      <Toggle checked={true} onChange={() => {}} />
                    ) : (
                      <span className="font-caps-xs text-caps-xs text-on-surface-variant">Managed by Google</span>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-label-md text-label-md text-on-surface mb-2">Active Sessions</h4>
                  <div className="bg-surface-bg border border-border-subtle rounded p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="material-symbols-outlined text-on-surface-variant">computer</span>
                      <div>
                        <div className="font-label-sm text-label-sm text-on-surface">Current Session</div>
                        <div className="font-caps-xs text-caps-xs text-on-surface-variant mt-0.5">Active now</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl border border-border-subtle p-6 mt-6 shadow-[0_1px_2px_rgba(2,6,23,0.05)]">
            <div className="mb-3">
              <h3 className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-1">Privacy</h3>
              <h2 className="font-headline-md text-headline-md text-on-surface">Data Privacy & Emergency Consent</h2>
            </div>
            <div className="space-y-0 divide-y divide-border-subtle">
              <div className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-label-md text-label-md text-on-surface">Live GPS Access for Emergency Responders</div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant">Allow automatic sharing of your precise location when triggering an SOS alert.</div>
                </div>
                <Toggle checked={prefs.gps_access} onChange={(v) => setPref('gps_access', v)} />
              </div>
              <div className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-label-md text-label-md text-on-surface">Anonymous Public Reporting</div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant">Hide your identity by default when submitting reports to the public barangay feed.</div>
                </div>
                <Toggle checked={prefs.anonymous_reporting} onChange={(v) => setPref('anonymous_reporting', v)} />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-border-subtle mt-6">
            <button
              type="button"
              onClick={savePreferences}
              disabled={saving}
              className="w-full sm:w-auto bg-gradient-to-r from-secondary to-[#316bf3] hover:shadow-md text-on-secondary font-label-md text-label-md py-3 px-8 rounded-lg shadow-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Preferences'}
            </button>
            <button type="button" onClick={() => setDeactivateOpen(true)} className="mt-4 sm:mt-0 text-error-red font-label-md text-label-md hover:underline transition-all">
              Request Account Deactivation
            </button>
          </div>
        </>
      )}

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      <ConfirmDialog
        open={deactivateOpen}
        title="Deactivate Account?"
        message="This will sign you out. Contact the barangay office to permanently delete your account. Proceed?"
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        icon="logout"
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateOpen(false)}
      />
    </div>
  );
}
