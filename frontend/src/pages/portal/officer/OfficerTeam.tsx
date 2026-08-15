import { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { getAdminProfile, deriveUnitStatus, fetchOpenUnitAssignments, UNIT_STATUS_DOT } from '../../../lib/admin';

type Unit = {
  id: string;
  name: string;
  type: string;
  status: string;
  area: string | null;
  duty_days?: number[] | null;
  last_location: string | null;
};

const TYPE_BADGE: Record<string, string> = {
  Tanod: 'bg-blue-100 text-blue-700',
  BFP: 'bg-error-red/10 text-error-red',
  Medical: 'bg-success-green/10 text-success-green',
  PNP: 'bg-slate-100 text-slate-600',
  Barangay: 'bg-secondary/10 text-secondary',
};

export default function OfficerTeam() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [openAssignments, setOpenAssignments] = useState<Record<string, string[]>>({});
  const [myUnitId, setMyUnitId] = useState<string | null>(null);
  const [myName, setMyName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const profile = await getAdminProfile();
      setMyName(profile.fullname);
      const mine = await supabase.from('dispatch_units').select('id').eq('lead_officer_id', profile.id).maybeSingle();
      setMyUnitId((mine.data?.id as string | undefined) ?? null);
      const [unitRes, openMap] = await Promise.all([
        supabase.from('dispatch_units').select('id, name, type, status, manual_status, area, duty_days, last_location').order('name'),
        fetchOpenUnitAssignments(),
      ]);
      setUnits((unitRes.data ?? []) as Unit[]);
      setOpenAssignments(openMap);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">Unit & Team</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">All registered response units under Barangay Culiat Safety Command. Your unit is highlighted.</p>
      </div>

      <div className="bg-white rounded-xl border border-border-subtle p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold">{myName.slice(0, 2).toUpperCase()}</div>
        <div>
          <div className="font-headline-md text-headline-md text-on-surface font-bold">{myName}</div>
          <div className="text-xs text-on-surface-variant">{myUnitId ? 'Linked to a dispatch unit' : 'Not linked to a unit — contact admin'}</div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-border-subtle p-12 text-center text-sm text-on-surface-variant">Loading roster…</div>
      ) : units.length === 0 ? (
        <div className="bg-white rounded-xl border border-border-subtle p-12 text-center text-sm text-on-surface-variant">No dispatch units registered yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {units.map((u) => {
            const mine = u.id === myUnitId;
            const st = deriveUnitStatus(u, openAssignments);
            return (
              <div key={u.id} className={`bg-white rounded-xl border p-5 transition-colors ${mine ? 'border-secondary ring-1 ring-secondary/30' : 'border-border-subtle'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${TYPE_BADGE[u.type] ?? 'bg-slate-100'}`}>
                      <span className="material-symbols-outlined text-[20px]">{u.type === 'Medical' ? 'local_hospital' : u.type === 'BFP' ? 'local_fire_department' : u.type === 'PNP' ? 'local_police' : 'shield_person'}</span>
                    </span>
                    <div>
                      <div className="font-label-md text-label-md text-on-surface font-bold">{u.name}</div>
                      <div className="text-[11px] text-on-surface-variant">{u.type}{u.area ? ` · ${u.area}` : ''}</div>
                    </div>
                  </div>
                  {mine && <span className="px-2 py-0.5 bg-secondary/10 text-secondary rounded-full text-[10px] font-bold uppercase tracking-wider">Your Unit</span>}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                    <span className={`w-2 h-2 rounded-full ${UNIT_STATUS_DOT[st] ?? 'bg-slate-400'}`}></span>
                    {st}
                  </span>
                  <span className="text-[11px] text-on-surface-variant">{u.last_location || 'Location not reported'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
