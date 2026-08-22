import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { fmtDate, logAudit } from '../../../lib/admin';
import Toast from '../../../components/Toast';
import { useScrollLock } from '../../../lib/useScrollLock';

type Blotter = {
  id: string;
  blotter_no: string | null;
  complainant_name: string;
  respondent_name: string;
  type: string;
  description: string | null;
  incident_date: string | null;
  status: string;
  assigned_lupon: string | null;
  hearing_logs: { title: string; date: string; outcome: string }[];
  created_at: string;
};

type Filter = 'All' | 'Pending' | 'Mediation' | 'Settled' | 'Escalated' | 'Closed';

const STATUS_BADGE: Record<string, string> = {
  Filed: 'bg-slate-100 text-slate-600',
  Scheduled: 'bg-warning-amber/10 text-warning-amber',
  Mediation: 'bg-sky-100 text-sky-700',
  Settled: 'bg-success-green/10 text-success-green',
  Escalated: 'bg-error-red/10 text-error-red',
  Closed: 'bg-slate-100 text-slate-500',
};

const emptyHearing = (): { title: string; date: string; outcome: string }[] => [];

const nextBlotterNo = (rows: Blotter[]) => {
  const year = new Date().getFullYear();
  const nums = rows
    .map((r) => r.blotter_no?.match(/BLTR-\d{4}-(\d+)/)?.[1])
    .filter((n): n is string => !!n)
    .map((n) => parseInt(n, 10));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `BLTR-${year}-${String(next).padStart(3, '0')}`;
};

export default function AdminBlotterTracking() {
  const [blotters, setBlotters] = useState<Blotter[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hearingOpen, setHearingOpen] = useState(false);

  useScrollLock(formOpen || (hearingOpen && activeId != null));
  const [hearing, setHearing] = useState({ title: '', date: '', outcome: '' });
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [form, setForm] = useState({
    complainant_name: '',
    respondent_name: '',
    type: 'Property Dispute',
    description: '',
    incident_date: '',
    assigned_lupon: '',
  });

  const fetchAll = async () => {
    const res = await supabase.from('blotters').select('*').order('created_at', { ascending: false }).limit(100);
    return (res.data ?? []).map((r) => ({ ...r, hearing_logs: r.hearing_logs ?? [] })) as Blotter[];
  };

  useEffect(() => {
    void (async () => {
      const rows = await fetchAll();
      setBlotters(rows);
      if (rows.length > 0) setActiveId(rows[0].id);
      setLoading(false);
    })();
  }, []);

  const active = blotters.find((b) => b.id === activeId) ?? null;

  const visible = blotters.filter((b) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      q === '' ||
      (b.blotter_no ?? '').toLowerCase().includes(q) ||
      b.complainant_name.toLowerCase().includes(q) ||
      b.respondent_name.toLowerCase().includes(q) ||
      b.type.toLowerCase().includes(q);
    const matchesFilter =
      filter === 'All' ||
      (filter === 'Pending' && (b.status === 'Filed' || b.status === 'Scheduled')) ||
      b.status === filter;
    return matchesQuery && matchesFilter;
  });

  const counts = useMemo(
    () => ({
      total: blotters.length,
      pending: blotters.filter((b) => b.status === 'Filed' || b.status === 'Scheduled').length,
      mediation: blotters.filter((b) => b.status === 'Mediation').length,
      settled: blotters.filter((b) => b.status === 'Settled').length,
      escalated: blotters.filter((b) => b.status === 'Escalated').length,
      closed: blotters.filter((b) => b.status === 'Closed').length,
    }),
    [blotters]
  );

  const updateStatus = async (b: Blotter, status: string) => {
    const { error } = await supabase.from('blotters').update({ status, updated_at: new Date().toISOString() }).eq('id', b.id);
    if (error) {
      setToast({ type: 'error', message: error.message });
    } else {
      await logAudit('Update blotter', `${b.blotter_no ?? 'Blotter'} marked as ${status}.`);
      setBlotters(await fetchAll());
    }
  };

  const addHearing = async () => {
    if (!active || !hearing.title.trim()) return;
    const logs = [...(active.hearing_logs ?? []), { title: hearing.title.trim(), date: hearing.date || new Date().toISOString().slice(0, 10), outcome: hearing.outcome.trim() }];
    const { error } = await supabase.from('blotters').update({ hearing_logs: logs, status: active.status === 'Filed' ? 'Scheduled' : active.status, updated_at: new Date().toISOString() }).eq('id', active.id);
    if (error) {
      setToast({ type: 'error', message: error.message });
    } else {
      await logAudit('Log hearing', `Added hearing "${hearing.title.trim()}" to ${active.blotter_no ?? 'blotter'}.`);
      setHearingOpen(false);
      setHearing({ title: '', date: '', outcome: '' });
      setBlotters(await fetchAll());
    }
  };

  const createBlotter = async () => {
    if (!form.complainant_name.trim() || !form.respondent_name.trim()) return;
    setSaving(true);
    try {
      const no = nextBlotterNo(blotters);
      const payload: Record<string, unknown> = {
        blotter_no: no,
        complainant_name: form.complainant_name.trim(),
        respondent_name: form.respondent_name.trim(),
        type: form.type,
        description: form.description.trim() || null,
        incident_date: form.incident_date || null,
        assigned_lupon: form.assigned_lupon.trim() || null,
        status: 'Filed',
        hearing_logs: emptyHearing(),
      };
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) payload.created_by = session.user.id;
      const { error } = await supabase.from('blotters').insert(payload);
      if (error) throw new Error(error.message);
      await logAudit('File blotter', `Filed ${no} (${form.type}).`);
      setToast({ type: 'success', message: `${no} filed.` });
      setFormOpen(false);
      setForm({ complainant_name: '', respondent_name: '', type: 'Property Dispute', description: '', incident_date: '', assigned_lupon: '' });
      const rows = await fetchAll();
      setBlotters(rows);
      setActiveId(rows[0]?.id ?? null);
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to file blotter.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-lg pl-10 pr-4 py-2 font-body-sm text-body-sm focus:ring-2 focus:ring-secondary/50 placeholder:text-on-surface-variant/70"
              placeholder="Search Complainant / Respondent / Blotter No..."
              type="text"
            />
          </div>
          <div className="flex bg-surface-container-low rounded-lg p-1 flex-wrap">
            {(['All', 'Pending', 'Mediation', 'Settled', 'Escalated', 'Closed'] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded font-label-sm text-label-sm transition-colors ${filter === f ? 'bg-white shadow-sm text-on-surface' : 'text-on-surface-variant hover:bg-white/50'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => setFormOpen(true)} className="bg-[#1E40AF] hover:bg-[#1E40AF]/90 text-white font-label-md text-label-md py-2 px-4 rounded-lg flex items-center gap-2 transition-colors shrink-0">
          <span className="material-symbols-outlined text-[18px]">add</span>
          File New Blotter Entry
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white rounded-lg border border-border-subtle px-4 py-3"><div className="text-[11px] text-on-surface-variant uppercase tracking-wider">Total</div><div className="text-xl font-bold text-on-surface">{counts.total}</div></div>
        <div className="bg-white rounded-lg border border-border-subtle px-4 py-3"><div className="text-[11px] text-on-surface-variant uppercase tracking-wider">Filed / Scheduled</div><div className="text-xl font-bold text-warning-amber">{counts.pending}</div></div>
        <div className="bg-white rounded-lg border border-border-subtle px-4 py-3"><div className="text-[11px] text-on-surface-variant uppercase tracking-wider">Mediation</div><div className="text-xl font-bold text-sky-700">{counts.mediation}</div></div>
        <div className="bg-white rounded-lg border border-border-subtle px-4 py-3"><div className="text-[11px] text-on-surface-variant uppercase tracking-wider">Settled</div><div className="text-xl font-bold text-success-green">{counts.settled}</div></div>
        <div className="bg-white rounded-lg border border-border-subtle px-4 py-3"><div className="text-[11px] text-on-surface-variant uppercase tracking-wider">Escalated</div><div className="text-xl font-bold text-error-red">{counts.escalated}</div></div>
        <div className="bg-white rounded-lg border border-border-subtle px-4 py-3"><div className="text-[11px] text-on-surface-variant uppercase tracking-wider">Closed</div><div className="text-xl font-bold text-on-surface">{counts.closed}</div></div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        <div className="xl:flex-[6.5] bg-surface-container-lowest rounded-xl border border-border-subtle shadow-sm flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle bg-surface-bright flex items-center justify-between">
            <div className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-widest">Active Cases Register</div>
          </div>
          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="p-10 text-center text-sm text-on-surface-variant">Loading blotters…</div>
            ) : visible.length === 0 ? (
              <div className="p-10 text-center text-sm text-on-surface-variant">No blotters match your filters.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-surface-bright z-10 border-b border-border-subtle">
                  <tr>
                    <th className="px-5 py-3 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider font-semibold whitespace-nowrap">Blotter No.</th>
                    <th className="px-5 py-3 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider font-semibold whitespace-nowrap">Filing Date</th>
                    <th className="px-5 py-3 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider font-semibold">Complainant vs. Respondent</th>
                    <th className="px-5 py-3 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider font-semibold">Status</th>
                    <th className="px-5 py-3 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {visible.map((b) => (
                    <tr
                      key={b.id}
                      onClick={() => setActiveId(b.id)}
                      className={`transition-colors cursor-pointer ${activeId === b.id ? 'bg-blue-50/30' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-5 py-4 font-label-md text-label-md text-secondary font-medium">{b.blotter_no ?? '—'}</td>
                      <td className="px-5 py-4 font-body-sm text-body-sm text-on-surface-variant">{fmtDate(b.created_at, 'short')}</td>
                      <td className="px-5 py-4">
                        <div className="font-label-sm text-label-sm text-on-surface font-medium">{b.complainant_name}</div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant text-xs mt-0.5">vs. {b.respondent_name}</div>
                        <div className="font-caps-xs text-caps-xs text-[#1E40AF] mt-1">{b.type}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-sm text-[11px] font-medium border border-border-subtle ${STATUS_BADGE[b.status] ?? 'bg-slate-100 text-slate-600'}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span> {b.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button type="button" onClick={() => setActiveId(b.id)} className="text-on-surface-variant hover:text-secondary p-1"><span className="material-symbols-outlined text-[20px]">visibility</span></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="xl:flex-[3.5] bg-surface-container-lowest rounded-xl border border-border-subtle shadow-sm flex flex-col overflow-hidden">
          {active ? (
            <>
              <div className="px-5 py-4 border-b border-border-subtle bg-[#1E40AF] text-white flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-caps-xs text-[10px] uppercase tracking-widest text-white/80">Case File</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[active.status] ?? 'bg-slate-100 text-slate-600'}`}>{active.status}</span>
                </div>
                <div className="font-headline-md text-headline-md font-bold">{active.blotter_no ?? 'Unassigned'}</div>
              </div>
              <div className="flex-1 p-5 flex flex-col gap-6 bg-surface-bg overflow-y-auto">
                <div className="bg-white rounded-lg border border-border-subtle p-4 shadow-sm">
                  <h4 className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-widest mb-3">Statement of Dispute</h4>
                  <p className="font-body-sm text-body-sm text-on-surface leading-relaxed">{active.description || 'No description on file.'}</p>
                  <div className="mt-4 pt-3 border-t border-border-subtle flex justify-between items-center text-xs text-on-surface-variant flex-wrap gap-2">
                    <span>Assigned Lupon: {active.assigned_lupon ?? 'Unassigned'}</span>
                    {active.incident_date && <span>Incident: {fmtDate(active.incident_date, 'short')}</span>}
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-border-subtle p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-widest">Lupon Hearing Logs</h4>
                    <button type="button" onClick={() => setHearingOpen(true)} className="text-xs font-semibold text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">add</span> Add Hearing
                    </button>
                  </div>
                  {!active.hearing_logs?.length ? (
                    <p className="text-sm text-on-surface-variant">No hearing logged yet.</p>
                  ) : (
                    <div className="relative pl-4 border-l-2 border-border-subtle space-y-4">
                      {active.hearing_logs.map((h, i) => (
                        <div key={i} className="relative">
                          <span className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${i === 0 ? 'bg-[#1E40AF]' : 'bg-border-subtle'}`}></span>
                          <div className="font-label-sm text-label-sm text-on-surface font-medium">{h.title}</div>
                          <div className="font-body-sm text-body-sm text-on-surface-variant text-xs mt-1">{h.date}</div>
                          {h.outcome && <div className="font-body-sm text-body-sm text-on-surface-variant text-xs mt-1">{h.outcome}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-5 border-t border-border-subtle bg-surface-bright flex flex-col gap-2">
                <div className="flex gap-2">
                  {(active.status === 'Scheduled' || active.status === 'Filed') && (
                    <button type="button" onClick={() => updateStatus(active, 'Mediation')} className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-label-md text-label-md py-2.5 rounded-lg transition-colors">
                      Start Mediation
                    </button>
                  )}
                  {active.status !== 'Settled' && active.status !== 'Closed' && (
                    <button type="button" onClick={() => updateStatus(active, 'Settled')} className="flex-1 bg-[#1E40AF] hover:bg-[#1E40AF]/90 text-white font-label-md text-label-md py-2.5 rounded-lg transition-colors">
                      Mark Settled
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  {active.status !== 'Escalated' && active.status !== 'Closed' && (
                    <button type="button" onClick={() => updateStatus(active, 'Escalated')} className="flex-1 bg-white border border-error-red/30 hover:bg-error-red/5 text-error-red font-label-md text-label-md py-2.5 rounded-lg transition-colors">
                      Escalate (CFA)
                    </button>
                  )}
                  {active.status !== 'Closed' && (
                    <button type="button" onClick={() => updateStatus(active, 'Closed')} className="flex-1 bg-surface-dim hover:bg-outline-variant text-on-surface font-label-md text-label-md py-2.5 rounded-lg transition-colors">
                      Close Case
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-on-surface-variant">Select a blotter to view the case file.</div>
          )}
        </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-border-subtle flex justify-between items-center sticky top-0 bg-surface-container-lowest z-10">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">File New Blotter Entry</h3>
              <button type="button" onClick={() => setFormOpen(false)} className="text-on-surface-variant hover:text-on-surface" aria-label="Close"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1.5">Complainant *</label>
                  <input className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.complainant_name} onChange={(e) => setForm({ ...form, complainant_name: e.target.value })} placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1.5">Respondent *</label>
                  <input className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.respondent_name} onChange={(e) => setForm({ ...form, respondent_name: e.target.value })} placeholder="Full name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1.5">Case Type</label>
                  <select className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {['Property Dispute', 'Noise Complaint', 'Physical Injury', 'Slander / Defamation', 'Family Dispute', 'Debt / Loan Conflict', 'Other'].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1.5">Incident Date</label>
                  <input type="date" className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.incident_date} onChange={(e) => setForm({ ...form, incident_date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Assigned Lupon</label>
                <input className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.assigned_lupon} onChange={(e) => setForm({ ...form, assigned_lupon: e.target.value })} placeholder="e.g. Kagawad Reyes" />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Statement of Dispute</label>
                <textarea rows={3} className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the complaint…" />
              </div>
              <button type="button" disabled={saving} onClick={createBlotter} className="w-full bg-[#1E40AF] hover:bg-[#1E40AF]/90 text-white rounded-lg py-2 text-label-md font-medium disabled:opacity-50 transition-colors">
                {saving ? 'Filing…' : 'File Blotter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {hearingOpen && active && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-border-subtle flex justify-between items-center sticky top-0 bg-surface-container-lowest z-10">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Log Hearing — {active.blotter_no}</h3>
              <button type="button" onClick={() => setHearingOpen(false)} className="text-on-surface-variant hover:text-on-surface" aria-label="Close"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Hearing Title</label>
                <input className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={hearing.title} onChange={(e) => setHearing({ ...hearing, title: e.target.value })} placeholder="e.g. 1st Conciliation Hearing" />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Date</label>
                <input type="date" className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={hearing.date} onChange={(e) => setHearing({ ...hearing, date: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Outcome</label>
                <textarea rows={2} className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary resize-none" value={hearing.outcome} onChange={(e) => setHearing({ ...hearing, outcome: e.target.value })} placeholder="e.g. Both parties agreed…" />
              </div>
              <button type="button" onClick={addHearing} className="w-full bg-[#1E40AF] hover:bg-[#1E40AF]/90 text-white rounded-lg py-2 text-label-md font-medium transition-colors">Log Hearing</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
