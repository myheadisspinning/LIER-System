import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';

function Toggle({ defaultOn, accent = 'bg-secondary' }: { defaultOn?: boolean; accent?: string }) {
  const [on, setOn] = useState(defaultOn ?? false);
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={on} onChange={() => setOn((v) => !v)} className="sr-only peer" />
      <div
        className={`w-11 h-6 bg-surface-variant rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:${accent}`}
      ></div>
    </label>
  );
}

const inputClass =
  'w-full pl-9 pr-3 py-2 bg-surface-bg border border-border-subtle rounded-lg text-body-sm font-body-sm focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-shadow';

type UserProfile = {
  fullname: string;
  dob: string;
  gender: string;
  address: string;
  phone: string;
  email: string;
};

export default function AccountSettings() {
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: profileData } = await supabase
        .from('public_users')
        .select('fullname, dob, gender, address, phone')
        .eq('id', user.id)
        .single();
      if (profileData) {
        setProfile({
          fullname: profileData.fullname || '',
          dob: profileData.dob || '',
          gender: profileData.gender || '',
          address: profileData.address || '',
          phone: profileData.phone || '',
          email: user.email || '',
        });
      }
      setLoading(false);
    })();
  }, []);

  const handleUpdateProfile = async () => {
    if (!profile) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('public_users')
      .update({
        fullname: profile.fullname,
        dob: profile.dob || null,
        gender: profile.gender || null,
        address: profile.address,
        phone: profile.phone,
      })
      .eq('id', user.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="w-full">
      {loading ? (
        <div className="p-10 text-center text-sm text-on-surface-variant">Loading account settings…</div>
      ) : !profile ? (
        <div className="p-10 text-center text-sm text-on-surface-variant">No profile data available.</div>
      ) : (
        <>
          <div className="bg-surface-container-lowest border border-border-subtle rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-surface-container/50 to-transparent pointer-events-none"></div>
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-20 h-20 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-headline-lg text-headline-lg shadow-md border-4 border-surface-container-lowest">
                {profile.fullname.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'}
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md text-on-background">{profile.fullname}</h3>
                <div className="flex items-center gap-2 mt-1 text-on-surface-variant font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-[16px]">location_on</span>
                  <p>{profile.address || 'House No., Street, Purok/Area, Barangay Culiat'}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 relative z-10">
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
                  <input className={inputClass} type="text" value={profile.fullname} onChange={(e) => setProfile({ ...profile, fullname: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant block">Date of Birth</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">calendar_today</span>
                  <input className={inputClass} type="date" value={profile.dob} onChange={(e) => setProfile({ ...profile, dob: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant block">Gender</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">wc</span>
                  <select className={`${inputClass} appearance-none`} value={profile.gender} onChange={(e) => setProfile({ ...profile, gender: e.target.value })}>
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
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  ></textarea>
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant block">Mobile Number</label>
                <div className="relative flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-border-subtle bg-surface-container rounded-l-lg text-on-surface-variant font-label-sm text-label-sm">
                    +63
                  </span>
                  <input className="flex-1 w-full px-3 py-2 bg-surface-bg border border-border-subtle rounded-r-lg text-body-sm font-body-sm focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-shadow" type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
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
            <button type="button" onClick={handleUpdateProfile} className="px-4 py-2 border border-border-subtle hover:bg-surface-container text-on-surface font-label-md text-label-md rounded-lg transition-colors shadow-sm">
              Update Personal Info
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
                <input className="w-full pl-9 pr-3 py-2 bg-surface-bg border border-border-subtle rounded-lg text-body-sm font-body-sm focus:border-error-red focus:ring-1 focus:ring-error-red outline-none transition-shadow" placeholder="e.g., Maria Dela Cruz" type="text" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant block">Relationship to Resident</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">family_restroom</span>
                <select className="w-full pl-9 pr-3 py-2 bg-surface-bg border border-border-subtle rounded-lg text-body-sm font-body-sm focus:border-error-red focus:ring-1 focus:ring-error-red outline-none transition-shadow appearance-none">
                  <option disabled selected value="">
                    Select relationship...
                  </option>
                  <option value="spouse">Spouse</option>
                  <option value="parent">Parent</option>
                  <option value="sibling">Sibling</option>
                  <option value="child">Child</option>
                  <option value="friend">Friend</option>
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
                <input className="flex-1 w-full px-3 py-2 bg-surface-bg border border-border-subtle rounded-r-lg text-body-sm font-body-sm focus:border-error-red focus:ring-1 focus:ring-error-red outline-none transition-shadow" placeholder="9XX XXX XXXX" type="tel" />
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-border-subtle bg-surface/30 rounded-b-xl mt-auto">
            <button type="button" className="w-full px-4 py-3 bg-secondary hover:bg-secondary-container text-on-secondary font-label-md text-label-md font-bold rounded-lg transition-colors shadow-md flex justify-center items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">save</span>
              Save Emergency Contact
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
            <Toggle defaultOn />
          </div>
          <div className="py-3 flex items-center justify-between">
            <div>
              <div className="font-label-md text-label-md text-on-surface">Real-Time Case Progress Updates</div>
              <div className="font-body-sm text-body-sm text-on-surface-variant">Get notified when status changes on your reported incidents.</div>
            </div>
            <Toggle defaultOn />
          </div>
          <div className="py-3 flex items-center justify-between">
            <div>
              <div className="font-label-md text-label-md text-on-surface">General Barangay Announcements</div>
              <div className="font-body-sm text-body-sm text-on-surface-variant">Newsletters, event schedules, and administrative updates.</div>
            </div>
            <Toggle />
          </div>
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-start space-x-3">
              <span className="material-symbols-outlined text-warning-amber mt-0.5">volume_up</span>
              <div>
                <div className="font-label-md text-label-md text-on-surface">High-Priority Siren Alerts</div>
                <div className="font-body-sm text-body-sm text-on-surface-variant">Play loud audible alarm for severe weather or direct threats, overriding silent mode.</div>
              </div>
            </div>
            <Toggle defaultOn accent="bg-warning-amber" />
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
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">Current Password</label>
              <input className="w-full bg-surface-bg border border-border-subtle rounded px-3 py-2 text-body-sm font-body-sm focus:ring-1 focus:ring-secondary focus:border-secondary transition-all" placeholder="••••••••" type="password" />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">New Password</label>
              <input className="w-full bg-surface-bg border border-border-subtle rounded px-3 py-2 text-body-sm font-body-sm focus:ring-1 focus:ring-secondary focus:border-secondary transition-all" placeholder="••••••••" type="password" />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">Confirm New Password</label>
              <input className="w-full bg-surface-bg border border-border-subtle rounded px-3 py-2 text-body-sm font-body-sm focus:ring-1 focus:ring-secondary focus:border-secondary transition-all" placeholder="••••••••" type="password" />
            </div>
            <button type="button" className="mt-3 bg-surface-bg border border-border-subtle text-on-surface font-label-md text-label-md py-2 px-4 rounded hover:bg-surface-container transition-colors">
              Update Password
            </button>
          </div>
          <div className="space-y-6 md:pl-6 md:border-l border-border-subtle">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-label-md text-label-md text-on-surface">Two-Factor Authentication (SMS)</div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant">Require a code sent to your mobile on new logins.</div>
                </div>
                <Toggle defaultOn />
              </div>
            </div>
            <div>
              <h4 className="font-label-md text-label-md text-on-surface mb-2">Active Sessions</h4>
              <div className="bg-surface-bg border border-border-subtle rounded p-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="material-symbols-outlined text-on-surface-variant">computer</span>
                  <div>
                    <div className="font-label-sm text-label-sm text-on-surface">Chrome on Windows 11</div>
                    <div className="font-caps-xs text-caps-xs text-on-surface-variant mt-0.5">Quezon City — Current Session</div>
                  </div>
                </div>
              </div>
              <button type="button" className="mt-3 text-error-red font-label-sm text-label-sm hover:underline flex items-center">
                <span className="material-symbols-outlined text-[16px] mr-1">logout</span>
                Log Out All Other Devices
              </button>
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
            <Toggle defaultOn />
          </div>
          <div className="py-3 flex items-center justify-between">
            <div>
              <div className="font-label-md text-label-md text-on-surface">Anonymous Public Reporting</div>
              <div className="font-body-sm text-body-sm text-on-surface-variant">Hide your identity by default when submitting reports to the public barangay feed.</div>
            </div>
            <Toggle />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-border-subtle mt-6">
        <button
          type="button"
          onClick={() => {
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
          }}
          className="w-full sm:w-auto bg-gradient-to-r from-secondary to-[#316bf3] hover:shadow-md text-on-secondary font-label-md text-label-md py-3 px-8 rounded-lg shadow-sm transition-all duration-200 active:scale-[0.98]"
        >
          {saved ? 'Preferences Saved' : 'Save Preferences'}
        </button>
        <button type="button" className="mt-4 sm:mt-0 text-error-red font-label-md text-label-md hover:underline transition-all">
          Request Account Deactivation
        </button>
      </div>
        </>
      )}
    </div>
  );
}
