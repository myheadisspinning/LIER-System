import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { logAudit, DUTY_DAYS, dutyDaysLabel, deriveUnitStatus, fetchOpenUnitAssignments, isOnDutyToday, UNIT_STATUS_BADGE, UNIT_STATUS_DOT, UNIT_STATUS_CHOICES } from '../../../lib/admin';
import Toast from '../../../components/Toast';

type UnitRow = {
  id: string;
  name: string;
  type: string;
  status: string;
  manual_status: string | null;
  area: string | null;
  duty_days: number[] | null;
  last_location: string | null;
  lead_officer_id: string | null;
  created_at: string;
};

type OfficerRow = { id: string; fullname: string };

type FormState = {
  name: string;
  type: string;
  area: string;
  duty_days: number[];
  last_location: string;
  lead_officer_id: string;
};

const DEFAULT_FORM: FormState = { name: '', type: 'Tanod', area: '', duty_days: DUTY_DAYS.map((d) => d.value), last_location: '', lead_officer_id: '' };

const TYPE_ICON: Record<string, string> = { Tanod: 'shield_person', BFP: 'fire_truck', Medical: 'ambulance', PNP: 'local_police', Barangay: 'home' };
const TYPE_COLOR: Record<string, string> = { Tanod: 'text-sky-600 bg-sky-100', BFP: 'text-error-red bg-error-red/10', Medical: 'text-success-green bg-success-green/10', PNP: 'text-blue-700 bg-blue-100', Barangay: 'text-on-surface bg-surface-variant' };

const STATUS_SORT_ORDER = ['Available', 'En Route', 'On Scene', 'Busy', 'Off-Duty'];

export default function AdminTanodRoster() {
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [officers, setOfficers] = useState<OfficerRow[]>([]);
  const [openAssignments, setOpenAssignments] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UnitRow | null>(null);
  const [viewing, setViewing] = useState<UnitRow | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<UnitRow | null>(null);
  const [statusValue, setStatusValue] = useState('Auto');
  const [deleteTarget, setDeleteTarget] = useState<UnitRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = async () => {
    const [unitRes, openMap, officerRes] = await Promise.all([
      supabase.from('dispatch_units').select('id, name, type, status, manual_status, area, duty_days, last_location, lead_officer_id, created_at').order('name'),
      fetchOpenUnitAssignments(),
      supabase.from('public_users').select('id, fullname').eq('role', 'officer').order('fullname'),
    ]);
    return {
      units: (unitRes.data ?? []) as UnitRow[],
      openAssignments: openMap,
      officers: (officerRes.data ?? []) as OfficerRow[],
    };
  };

  const load = async () => {
    setLoading(true);
    const { units, openAssignments, officers } = await fetchAll();
    setUnits(units);
    setOpenAssignments(openAssignments);
    setOfficers(officers);
    setLoading(false);
  };

  useEffect(() => {
    void (async () => {
      const { units, openAssignments, officers } = await fetchAll();
      setUnits(units);
      setOpenAssignments(openAssignments);
      setOfficers(officers);
      setLoading(false);
    })();
  }, []);

  const rows = useMemo(
    () =>
      units
        .map((u) => ({ ...u, derivedStatus: deriveUnitStatus(u, openAssignments) }))
        .sort((a, b) => {
          const pa = STATUS_SORT_ORDER.indexOf(a.derivedStatus);
          const pb = STATUS_SORT_ORDER.indexOf(b.derivedStatus);
          if (pa !== pb) return pa - pb;
          return a.name.localeCompare(b.name);
        }),
    [units, openAssignments],
  );

  const stats = useMemo(() => {
    const total = rows.length;
    const field = rows.filter((u) => ['En Route', 'On Scene', 'Busy'].includes(u.derivedStatus)).length;
    const available = rows.filter((u) => u.derivedStatus === 'Available').length;
    const off = rows.filter((u) => u.derivedStatus === 'Off-Duty').length;
    return { total, field, available, off };
  }, [rows]);

  const onDutyToday = useMemo(() => rows.filter((u) => isOnDutyToday(u.duty_days)), [rows]);

  const officerName = (id: string | null) => (id ? officers.find((o) => o.id === id)?.fullname : null);

  const statusReason = (u: UnitRow) => {
    if (u.manual_status) return `Manually set to ${u.manual_status} by an admin (override).`;
    const open = openAssignments[u.id];
    if (open && open.includes('Progress')) return 'Responding to an active incident (On Scene).';
    if (open && open.some((s) => s === 'Assigned' || s === 'Verifying')) return 'Dispatched to an incident via the Dispatch Terminal.';
    if (isOnDutyToday(u.duty_days)) return 'On duty today and ready for dispatch.';
    return 'Not on today\'s duty roster.';
  };

  const openCreate = () => {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setModalOpen(true);
  };

  const openEdit = (u: UnitRow) => {
    setEditing(u);
    setForm({
      name: u.name,
      type: u.type,
      area: u.area ?? '',
      duty_days: u.duty_days ?? [],
      last_location: u.last_location ?? '',
      lead_officer_id: u.lead_officer_id ?? '',
    });
    setModalOpen(true);
  };

  const toggleDuty = (day: number) =>
    setForm((f) => ({ ...f, duty_days: f.duty_days.includes(day) ? f.duty_days.filter((d) => d !== day) : [...f.duty_days, day].sort((a, b) => a - b) }));

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      type: form.type,
      area: form.area.trim() || null,
      duty_days: form.duty_days,
      last_location: form.last_location.trim() || null,
      lead_officer_id: form.lead_officer_id || null,
    };
    const { error } = editing
      ? await supabase.from('dispatch_units').update(payload).eq('id', editing.id)
      : await supabase.from('dispatch_units').insert(payload);
    if (error) {
      setToast({ type: 'error', message: error.message });
    } else {
      await logAudit(editing ? 'Update responder' : 'Register responder', `${editing ? 'Updated' : 'Registered'} ${form.type} responder "${form.name.trim()}"${form.area.trim() ? ` (${form.area.trim()})` : ''}.`);
      setToast({ type: 'success', message: editing ? `Updated ${form.name.trim()}.` : `Registered ${form.name.trim()}.` });
      setModalOpen(false);
      setEditing(null);
      await load();
    }
    setSaving(false);
  };

  const printShift = () => window.print();

  const openStatus = (u: UnitRow) => {
    setStatusTarget(u);
    setStatusValue(u.manual_status ?? 'Auto');
    setOpenMenuId(null);
  };

  const saveStatus = async () => {
    if (!statusTarget) return;
    const manual_status = statusValue === 'Auto' ? null : statusValue;
    const { error } = await supabase.from('dispatch_units').update({ manual_status }).eq('id', statusTarget.id);
    if (error) {
      setToast({ type: 'error', message: error.message });
    } else {
      await logAudit(
        'Update responder status',
        `Set ${statusTarget.type} responder "${statusTarget.name}" status to ${manual_status ?? 'Auto (derived)'}.`,
      );
      setToast({ type: 'success', message: `Status set to ${statusValue}.` });
      setStatusTarget(null);
      await load();
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('dispatch_units').delete().eq('id', deleteTarget.id);
    if (error) {
      setToast({ type: 'error', message: error.message });
    } else {
      await logAudit('Delete responder', `Deleted ${deleteTarget.type} responder "${deleteTarget.name}".`);
      setToast({ type: 'success', message: `Deleted ${deleteTarget.name}.` });
      setDeleteTarget(null);
      await load();
    }
    setDeleting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">Tanod &amp; Responder Roster</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Real-time responder availability from duty roster and live dispatch data.</p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={printShift} className="flex items-center gap-2 px-4 py-2 border border-border-subtle rounded-lg text-label-md font-medium text-on-surface hover:bg-surface-variant transition-colors">
            <span className="material-symbols-outlined text-[18px]">print</span>
            Print Shift Sheet
          </button>
          <button type="button" onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-secondary text-on-secondary rounded-lg text-label-md font-medium hover:bg-secondary/90 transition-colors">
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Register New Responder
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-on-surface-variant">Loading roster…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-border-subtle p-5">
              <div className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-1">Total Responders</div>
              <div className="font-display-lg text-display-lg font-bold text-on-surface">{stats.total}</div>
              <div className="text-xs text-on-surface-variant mt-1">across all unit types</div>
            </div>
            <div className="bg-white rounded-xl border border-border-subtle p-5">
              <div className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-1">In-Field</div>
              <div className="font-display-lg text-display-lg font-bold text-warning-amber">{stats.field}</div>
              <div className="text-xs text-on-surface-variant mt-1">dispatched / on scene</div>
            </div>
            <div className="bg-white rounded-xl border border-border-subtle p-5">
              <div className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-1">Available Today</div>
              <div className="font-display-lg text-display-lg font-bold text-success-green">{stats.available}</div>
              <div className="text-xs text-on-surface-variant mt-1">on duty, ready for dispatch</div>
            </div>
            <div className="bg-white rounded-xl border border-border-subtle p-5">
              <div className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-1">Off-Duty</div>
              <div className="font-display-lg text-display-lg font-bold text-on-surface-variant">{stats.off}</div>
              <div className="text-xs text-on-surface-variant mt-1">not on today&apos;s roster</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border-subtle overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Today&apos;s On-Duty Responders</h3>
              <span className="text-xs text-on-surface-variant">{onDutyToday.length} on duty · {onDutyToday.filter((u) => u.derivedStatus === 'Available').length} available now</span>
            </div>
            {onDutyToday.length === 0 ? (
              <div className="p-8 text-center text-sm text-on-surface-variant">No responders scheduled for duty today.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-5">
                {onDutyToday.map((u) => (
                  <div key={u.id} className="border border-border-subtle rounded-lg p-4 flex items-start gap-3">
                    <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${TYPE_COLOR[u.type]}`}>
                      <span className="material-symbols-outlined text-[20px]">{TYPE_ICON[u.type] ?? 'shield_person'}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-on-surface truncate">{u.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${UNIT_STATUS_BADGE[u.derivedStatus]}`}>{u.derivedStatus}</span>
                      </div>
                      <div className="text-[11px] text-on-surface-variant mt-1">{u.type} · {u.area ?? 'Area not set'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-border-subtle overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border-subtle">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Responder Units</h3>
            </div>
            <div className="overflow-x-auto">
              {rows.length === 0 ? (
                <div className="p-12 text-center text-sm text-on-surface-variant">No responders registered.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-border-subtle">
                    <tr>
                      <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Unit</th>
                      <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Type</th>
                      <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Area</th>
                      <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Duty</th>
                      <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Status</th>
                      <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {rows.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${TYPE_COLOR[u.type]}`}>
                              <span className="material-symbols-outlined text-[18px]">{TYPE_ICON[u.type] ?? 'shield_person'}</span>
                            </span>
                            <div className="min-w-0">
                              <div className="font-medium text-on-surface truncate">{u.name}</div>
                              {u.lead_officer_id && (
                                <div className="text-[10px] text-on-surface-variant truncate flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[11px]">person</span>{officerName(u.lead_officer_id) ?? 'Linked officer'}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-on-surface-variant">{u.type}</td>
                        <td className="py-3 px-4 text-on-surface-variant max-w-[200px] truncate">{u.area ?? '—'}</td>
                        <td className="py-3 px-4 text-on-surface-variant text-xs">{dutyDaysLabel(u.duty_days)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${UNIT_STATUS_BADGE[u.derivedStatus]}`}>{u.derivedStatus}</span>
                          {u.manual_status && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded border border-warning-amber/50 text-warning-amber text-[9px] font-bold uppercase align-middle" title="Status manually overridden — set back to Auto to use the derived status.">Manual</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="relative inline-flex">
                            <button
                              type="button"
                              onClick={() => setOpenMenuId(openMenuId === u.id ? null : u.id)}
                              className="p-2 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors"
                              aria-label={`Actions for ${u.name}`}
                              aria-expanded={openMenuId === u.id}
                            >
                              <span className="material-symbols-outlined text-[20px]">more_vert</span>
                            </button>
                            {openMenuId === u.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                <div className="absolute right-0 top-full mt-1 w-44 z-50 bg-surface-container-lowest rounded-lg border border-border-subtle shadow-lg py-1">
                                  <button
                                    type="button"
                                    onClick={() => { setViewing(u); setOpenMenuId(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-variant transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">visibility</span>View
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { openEdit(u); setOpenMenuId(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-variant transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">edit</span>Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openStatus(u)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-variant transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">status</span>Status
                                  </button>
                                  <button
                                    type="button" 
                                    onClick={() => { setDeleteTarget(u); setOpenMenuId(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-error-red hover:bg-error-red/5 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">delete</span>Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {viewing && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle shadow-xl w-full max-w-2xl">
            <div className="px-5 py-4 border-b border-border-subtle flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Responder Information</h3>
              <button type="button" onClick={() => setViewing(null)} className="text-on-surface-variant hover:text-on-surface" aria-label="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <span className={`w-12 h-12 rounded-xl flex items-center justify-center ${TYPE_COLOR[viewing.type]}`}>
                  <span className="material-symbols-outlined text-[24px]">{TYPE_ICON[viewing.type] ?? 'shield_person'}</span>
                </span>
                <div>
                  <div className="font-headline-md text-headline-md font-bold text-on-surface">{viewing.name}</div>
                  <div className="text-xs text-on-surface-variant">{viewing.type} responder unit</div>
                </div>
                <span className={`ml-auto px-2.5 py-1 rounded-full text-xs font-semibold ${UNIT_STATUS_BADGE[deriveUnitStatus(viewing, openAssignments)]}`}>{deriveUnitStatus(viewing, openAssignments)}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-on-surface-variant block text-xs uppercase">Area / Zone</span><span className="font-medium text-on-surface">{viewing.area ?? '—'}</span></div>
                <div><span className="text-on-surface-variant block text-xs uppercase">Duty Days</span><span className="font-medium text-on-surface">{dutyDaysLabel(viewing.duty_days)}</span></div>
                <div><span className="text-on-surface-variant block text-xs uppercase">Lead Officer</span><span className="font-medium text-on-surface">{officerName(viewing.lead_officer_id) ?? 'Not assigned'}</span></div>
                <div><span className="text-on-surface-variant block text-xs uppercase">Registered</span><span className="font-medium text-on-surface">{new Date(viewing.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}</span></div>
                <div className="col-span-2"><span className="text-on-surface-variant block text-xs uppercase">Last Reported Location</span><span className="font-medium text-on-surface">{viewing.last_location ?? '—'}</span></div>
              </div>
              <div className="bg-surface-bg border border-border-subtle rounded-lg p-3 text-xs text-on-surface-variant">
                <span className="font-bold text-on-surface uppercase text-[10px] block mb-1">Live Status</span>
                {statusReason(viewing)}
              </div>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle shadow-xl w-full max-w-2xl">
            <div className="px-5 py-4 border-b border-border-subtle flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">{editing ? 'Update Responder' : 'Register New Responder'}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-on-surface-variant hover:text-on-surface" aria-label="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Unit Name</label>
                <input className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Tanod Patrol Unit 3" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1.5">Responder Type</label>
                  <select className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {['Tanod', 'BFP', 'Medical', 'PNP', 'Barangay'].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1.5">Area / Zone</label>
                  <input className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="e.g. Purok 4, Barangay Culiat" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Duty Days (available on these days)</label>
                <div className="flex flex-wrap gap-2">
                  {DUTY_DAYS.map((d) => {
                    const active = form.duty_days.includes(d.value);
                    return (
                      <button key={d.value} type="button" onClick={() => toggleDuty(d.value)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${active ? 'bg-secondary text-on-secondary border-secondary' : 'bg-surface-container-low text-on-surface-variant border-border-subtle'}`}>
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                {form.duty_days.length === 0 && <p className="text-[11px] text-error-red mt-1">Select at least one duty day — otherwise the responder will always show Off-Duty.</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1.5">Lead Officer (optional)</label>
                  <select className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.lead_officer_id} onChange={(e) => setForm({ ...form, lead_officer_id: e.target.value })}>
                    <option value="">— Not assigned —</option>
                    {officers.map((o) => (
                      <option key={o.id} value={o.id}>{o.fullname}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1.5">Duty Location</label>
                  <input className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.last_location} onChange={(e) => setForm({ ...form, last_location: e.target.value })} placeholder="e.g. Purok 4, Barangay Culiat" />
                </div>
              </div>
              <button type="button" disabled={saving || !form.name.trim() || form.duty_days.length === 0} onClick={save} className="w-full bg-secondary text-on-secondary rounded-lg py-2 text-label-md font-medium hover:bg-secondary/90 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : editing ? 'Update Responder' : 'Register Responder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {statusTarget && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle shadow-xl w-full max-w-2xl">
            <div className="px-5 py-4 border-b border-border-subtle flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Manual Override — {statusTarget.name}</h3>
              <button type="button" onClick={() => setStatusTarget(null)} className="text-on-surface-variant hover:text-on-surface" aria-label="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-on-surface-variant">
                <span className="font-semibold text-on-surface">Auto</span> reflects the real-time derived status
                (duty roster + live dispatch). Choosing a value overrides it until set back to Auto.
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setStatusValue('Auto')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors ${statusValue === 'Auto' ? 'border-secondary bg-secondary/5 text-secondary font-semibold' : 'border-border-subtle text-on-surface hover:bg-surface-variant'}`}
                >
                  <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">autorenew</span>Auto (derived)</span>
                  {statusValue === 'Auto' && <span className="material-symbols-outlined text-[18px]">check_circle</span>}
                </button>
                {UNIT_STATUS_CHOICES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStatusValue(s.value)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors ${statusValue === s.value ? 'border-secondary bg-secondary/5 text-secondary font-semibold' : 'border-border-subtle text-on-surface hover:bg-surface-variant'}`}
                  >
                    <span className={`flex items-center gap-2`}>
                      <span className={`w-2 h-2 rounded-full ${UNIT_STATUS_DOT[s.value]}`} />
                      {s.label}
                    </span>
                    {statusValue === s.value && <span className="material-symbols-outlined text-[18px]">check_circle</span>}
                  </button>
                ))}
              </div>
              <button type="button" onClick={saveStatus} className="w-full bg-secondary text-on-secondary rounded-lg py-2 text-label-md font-medium hover:bg-secondary/90 transition-colors">
                Save Status
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle shadow-xl w-full max-w-2xl">
            <div className="px-5 py-4 border-b border-border-subtle flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md font-bold text-error-red">Delete Responder</h3>
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} className="text-on-surface-variant hover:text-on-surface" aria-label="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className={`w-11 h-11 rounded-lg flex items-center justify-center ${TYPE_COLOR[deleteTarget.type]}`}>
                  <span className="material-symbols-outlined text-[22px]">{TYPE_ICON[deleteTarget.type] ?? 'shield_person'}</span>
                </span>
                <div>
                  <div className="font-headline-md text-headline-md font-bold text-on-surface">{deleteTarget.name}</div>
                  <div className="text-xs text-on-surface-variant">{deleteTarget.type} · {deleteTarget.area ?? 'Area not set'}</div>
                </div>
              </div>
              <p className="text-sm text-on-surface-variant">
                This permanently removes the responder from the roster. Incidents linked to this unit will be
                automatically unassigned. This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} className="px-4 py-2 rounded-lg border border-border-subtle text-label-md font-medium text-on-surface hover:bg-surface-variant transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={confirmDelete} disabled={deleting} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-error-red text-white text-label-md font-medium hover:bg-error-red/90 disabled:opacity-50 transition-colors">
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
