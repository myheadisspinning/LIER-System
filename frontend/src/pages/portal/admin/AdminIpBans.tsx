import Ph from '../../../components/PhIcon';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { logAudit, fmtDate, downloadCsv } from '../../../lib/admin';
import { formatRetryAfter } from '../../../lib/security';
import Toast from '../../../components/Toast';
import ConfirmDialog from '../../../components/ConfirmDialog';
import Pagination from '../../../components/Pagination';

type IpBanRow = {
  ip: string;
  reason: string;
  ban_count: number;
  expires_at: string;
  created_at: string;
};

const EMPTY_FORM = { ip: '', reason: '', duration: '7' };

const DURATION_OPTIONS: { value: string; label: string }[] = [
  { value: '15', label: '15 minutes' },
  { value: '1440', label: '24 hours' },
  { value: '10080', label: '7 days' },
  { value: '43200', label: '30 days' },
  { value: '525600', label: '1 year' },
];

export default function AdminIpBans() {
  const [bans, setBans] = useState<IpBanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showBanModal, setShowBanModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [unbanTarget, setUnbanTarget] = useState<IpBanRow | null>(null);
  const [unbanning, setUnbanning] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(t);
  }, []);

  const fetchBans = async () => {
    const { data, error } = await supabase.rpc('admin_list_ip_bans');
    if (error) throw new Error(error.message);
    return (data ?? []) as IpBanRow[];
  };

  useEffect(() => {
    void (async () => {
      try {
        setBans(await fetchBans());
      } catch (err) {
        setToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load IP bans' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bans;
    return bans.filter((b) => b.ip.toLowerCase().includes(q) || b.reason.toLowerCase().includes(q));
  }, [bans, search]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBans = filtered.slice(startIndex, endIndex);

  const handleBan = async () => {
    const ip = form.ip.trim();
    if (!ip) {
      setToast({ type: 'error', message: 'Please enter an IP address.' });
      return;
    }

    const durationMinutes = Number(form.duration);
    const hasActive = bans.some((b) => b.ip === ip);

    setSaving(true);
    try {
      const { error } = await supabase.rpc('admin_ban_ip', {
        p_ip: ip,
        p_reason: form.reason.trim() || 'Banned manually by administrator',
        p_duration: `${durationMinutes} minutes`,
      });
      if (error) throw new Error(error.message);

      await logAudit('Ban IP', `Manually banned ${ip} for ${durationMinutes} minute(s).`);
      setBans(await fetchBans());
      setToast({ type: 'success', message: hasActive ? 'IP ban updated.' : 'IP ban added.' });
      setShowBanModal(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to ban IP' });
    } finally {
      setSaving(false);
    }
  };

  const handleUnban = async () => {
    if (!unbanTarget) return;
    setUnbanning(true);
    try {
      const { error } = await supabase.rpc('admin_unban_ip', { p_ip: unbanTarget.ip });
      if (error) throw new Error(error.message);

      await logAudit('Unban IP', `Removed IP ban for ${unbanTarget.ip}.`);
      setBans(await fetchBans());
      setToast({ type: 'success', message: `Unbanned ${unbanTarget.ip}.` });
      setUnbanTarget(null);
    } catch (err) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to unban IP' });
    } finally {
      setUnbanning(false);
    }
  };

  const exportCsv = () => {
    downloadCsv(
      `ip-bans-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((b) => ({
        ip: b.ip,
        reason: b.reason,
        ban_count: b.ban_count,
        expires_at: new Date(b.expires_at).toISOString(),
        created_at: new Date(b.created_at).toISOString(),
      })),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface">IP Bans</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Automatically enforced when an IP exceeds the failed-attempt thresholds (5 fails → 15 min, 15 → 24 h, repeat → 7 d). Manage bans manually here.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowBanModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-white font-label-md text-label-md font-semibold shadow-sm hover:bg-secondary/90 transition-all active:scale-[0.98]"
          >
            <Ph className="text-[18px]" name="block" />
            Ban IP
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 bg-surface-container-lowest p-3 border border-border-subtle rounded-lg">
          <div className="relative flex-1 min-w-[200px]">
            <Ph className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]" name="search" />
            <input className="w-full bg-[#f1f5f9] border-none rounded text-body-sm pl-10 pr-3 py-2 text-on-surface focus:ring-1 focus:ring-secondary outline-none" placeholder="Search IP or reason..." type="text" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
          </div>
          <button type="button" onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 border border-border-subtle rounded text-label-md font-medium text-on-surface hover:bg-surface-variant transition-colors ml-auto">
            <Ph className="text-[18px]" name="download" />
            Export (CSV)
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-border-subtle rounded-xl flex flex-col overflow-hidden shadow-sm">
        <div className="bg-surface-variant/50 px-4 py-2 border-b border-border-subtle flex items-center justify-between">
          <h3 className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider">Active &amp; Pending Bans</h3>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {filtered.length === 0 ? 'No bans' : `${startIndex + 1}-${Math.min(endIndex, filtered.length)} of ${filtered.length}`}
          </span>
        </div>
        <div className="flex-1 overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-sm text-on-surface-variant">Loading IP bans…</div>
          ) : bans.length === 0 ? (
            <div className="p-12 text-center text-sm text-on-surface-variant">
              No IP bans right now. The rate limiter will auto-ban IPs that exceed the failure thresholds.
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-on-surface-variant">No bans match the current search.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface z-10 border-b border-border-subtle shadow-sm">
                <tr>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-2 px-4 font-bold">IP Address</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-2 px-4 font-bold hidden md:table-cell">Reason</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-2 px-4 font-bold">Attempts</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-2 px-4 font-bold">Expires</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-2 px-4 font-bold hidden lg:table-cell">Banned At</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-2 px-4 font-bold text-right w-[90px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {paginatedBans.map((b) => {
                  const retryIn = Math.max(0, new Date(b.expires_at).getTime() - now);
                  return (
                    <tr key={b.ip} className="hover:bg-surface-variant/50 transition-colors">
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-body-sm text-on-surface font-medium">{b.ip}</span>
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-error-red/10 text-error-red text-[11px] font-semibold">BANNED</span>
                      </td>
                      <td className="py-2.5 px-4 text-body-sm text-on-surface-variant hidden md:table-cell max-w-[260px] truncate">{b.reason}</td>
                      <td className="py-2.5 px-4 text-body-sm text-on-surface">{b.ban_count}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-body-sm text-on-surface-variant">
                        <span className="block font-medium text-on-surface">{fmtDate(b.expires_at, 'short')}</span>
                        <span className="text-[11px]">{retryIn > 0 ? `${formatRetryAfter(retryIn / 1000)} left` : 'expiring soon'}</span>
                      </td>
                      <td className="py-2.5 px-4 text-body-sm text-on-surface-variant hidden lg:table-cell whitespace-nowrap">{fmtDate(b.created_at, 'short')}</td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setUnbanTarget(b)}
                          disabled={unbanning}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-high text-error-red font-medium text-body-sm hover:bg-error-red/10 transition-colors disabled:opacity-50"
                        >
                          <Ph className="text-[16px]" name="check_circle" />
                          Unban
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <Pagination
          fabClearance
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(items) => {
            setItemsPerPage(items);
            setCurrentPage(1);
          }}
          totalItems={filtered.length}
          startIndex={startIndex}
          endIndex={endIndex}
        />
      </div>

      {showBanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-xl shadow-2xl w-full max-w-2xl mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Ban an IP Address</h3>
              <button type="button" onClick={() => setShowBanModal(false)} className="text-on-surface-variant hover:text-on-surface" aria-label="Close">
                <Ph name="close" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant block" htmlFor="ban-ip">IP Address</label>
                <input
                  className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-3 py-2.5 font-mono text-body-sm text-on-surface focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none"
                  id="ban-ip" placeholder="e.g. 203.0.113.42"
                  value={form.ip} onChange={(e) => setForm({ ...form, ip: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant block" htmlFor="ban-reason">Reason (optional)</label>
                <input
                  className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-3 py-2.5 text-body-sm text-on-surface focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none"
                  id="ban-reason" placeholder="e.g. Observed abuse"
                  value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant block" htmlFor="ban-duration">Duration</label>
                <select
                  className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-3 py-2.5 text-body-sm text-on-surface focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none cursor-pointer"
                  id="ban-duration" value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}>
                  {DURATION_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button" onClick={() => setShowBanModal(false)}
                  className="flex-1 py-2.5 rounded-lg bg-surface-container-high text-on-surface font-bold text-body-sm transition-all hover:bg-surface-container-highest"
                >
                  Cancel
                </button>
                <button
                  type="button" onClick={handleBan} disabled={saving || !form.ip.trim()}
                  className="flex-1 py-2.5 rounded-lg bg-error text-on-error font-bold text-body-sm shadow-lg transition-all hover:bg-error/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Ph className="animate-spin" name="progress_activity" /> : <Ph name="block" />}
                  {saving ? 'Banning…' : 'Ban IP'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={unbanTarget != null}
        title="Unban this IP?"
        message={unbanTarget ? `${unbanTarget.ip} will be allowed to attempt sign-in again immediately.` : ''}
        confirmLabel="Unban"
        cancelLabel="Cancel"
        icon="check_circle"
        onConfirm={() => void handleUnban()}
        onCancel={() => setUnbanTarget(null)}
      />

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}