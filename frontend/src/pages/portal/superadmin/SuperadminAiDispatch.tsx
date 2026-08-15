import { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import Toast from '../../../components/Toast';

type AuditRow = {
  id: string;
  actor: string;
  action: string;
  detail: string;
  created_at: string;
};

export default function SuperadminAiDispatch() {
  const [cfg, setCfg] = useState<Record<string, unknown>>({});
  const [original, setOriginal] = useState<Record<string, unknown>>({});
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const g = <T,>(key: string, fallback: T): T => {
    const v = (cfg[key] as T | undefined) ?? (original[key] as T | undefined);
    return v ?? fallback;
  };
  const set = (key: string, value: unknown) => setCfg((c) => ({ ...c, [key]: value }));

  const fetchAll = async () => {
    const [cfgRes, auditRes] = await Promise.all([
      supabase.from('ai_config').select('key, value'),
      supabase.from('ai_audit_logs').select('id, actor, action, detail, created_at').order('created_at', { ascending: false }).limit(6),
    ]);
    const map: Record<string, unknown> = {};
    (cfgRes.data ?? []).forEach((r) => {
      map[r.key] = r.value;
    });
    return { cfg: map, audit: (auditRes.data ?? []) as AuditRow[] };
  };

  const load = async () => {
    setLoading(true);
    const { cfg, audit } = await fetchAll();
    setCfg(cfg);
    setOriginal(cfg);
    setAudit(audit);
    setLoading(false);
  };

  useEffect(() => {
    void (async () => {
      const { cfg, audit } = await fetchAll();
      setCfg(cfg);
      setOriginal(cfg);
      setAudit(audit);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(cfg)) {
        if (JSON.stringify(value) !== JSON.stringify(original[key])) {
          const { error } = await supabase.from('ai_config').update({ value }).eq('key', key);
          if (error) throw new Error(error.message);
        }
      }
      await supabase.from('ai_audit_logs').insert({
        actor: 'Root_Admin',
        action: 'Updated AI configuration',
        detail: `Applied ${Object.keys(cfg).filter((k) => JSON.stringify(cfg[k]) !== JSON.stringify(original[k])).length} changed setting(s).`,
      });
      setOriginal(cfg);
      setToast({ type: 'success', message: 'AI configuration saved.' });
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Save failed.' });
    } finally {
      setSaving(false);
    }
  };

  const geminiClassified = audit.filter((a) => a.action === 'Classified Report').length;
  const fallbackClassified = audit.filter((a) => a.action === 'Classified via fallback rules').length;
  const total = audit.length;
  const successRate = total ? Math.round(((geminiClassified + fallbackClassified) / total) * 100) : 100;

  return (
    <div className="grid grid-cols-12 gap-8 max-w-[1400px] mx-auto">
      {/* Main Configuration Area */}
      <div className="col-span-12 lg:col-span-8 space-y-8">
        {/* 1. API & Model Management */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary">api</span>
              <h3 className="font-bold text-slate-900">API &amp; Model Management</h3>
            </div>
            <span className="text-[10px] font-black text-slate-300">SECTION 01</span>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Active AI Model</label>
                <select
                  className="w-full text-sm rounded-lg border-slate-200 focus:ring-secondary bg-white font-medium"
                  value={String(g('model', { name: 'gemini-flash-latest' }).name)}
                  onChange={(e) => set('model', { name: e.target.value })}
                >
                  <option value="gemini-flash-latest">Gemini Flash (Latest)</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                  <option value="gemini-flash-lite-latest">Gemini Flash Lite</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">API Key Management</label>
                <div className="flex gap-2">
                  <input className="flex-1 text-sm rounded-lg border-slate-200 bg-slate-50 focus:ring-secondary" readOnly type="password" value="••••••••••••••••••••••••••••" />
                  <button type="button" onClick={() => setToast({ type: 'success', message: 'Key is stored as a Supabase Edge Function secret (GEMINI_API_KEY).' })} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-black transition-all">Manage</button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-600 mb-3">
                  <span>Temperature</span>
                  <span className="text-secondary">{(Number(g('temperature', { value: 0.1 }).value) || 0).toFixed(1)}</span>
                </div>
                <input
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                  max="100" min="0" type="range"
                  value={Math.round((Number(g('temperature', { value: 0.1 }).value) || 0) * 100)}
                  onChange={(e) => set('temperature', { value: Math.round(Number(e.target.value)) / 100 })}
                  style={{ accentColor: '#0051d5' }}
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-2">
                  <span>0.0 (Precise)</span>
                  <span>1.0 (Creative)</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Max Response Tokens</label>
                <div className="relative">
                  <input
                    className="w-full text-sm rounded-lg border-slate-200 focus:ring-secondary pr-12 font-semibold"
                    type="number"
                    value={Number(g('max_tokens', { value: 1024 }).value) || 1024}
                    onChange={(e) => set('max_tokens', { value: Math.max(256, Number(e.target.value)) })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">TKN</span>
                </div>
              </div>
            </div>
            <div className="pt-6 border-t border-slate-50">
              <div className="flex items-center justify-between p-4 bg-blue-50/30 rounded-xl border border-blue-100/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <span className="material-symbols-outlined">auto_awesome</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Global AI Assistance</h4>
                    <p className="text-xs text-slate-500">Enable/Disable AI-assisted incident classification and unit suggestion.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold ${g('ai_enabled', { enabled: true }).enabled ? 'text-secondary' : 'text-slate-400'}`}>{g('ai_enabled', { enabled: true }).enabled ? 'ENABLED' : 'DISABLED'}</span>
                  <button type="button" onClick={() => set('ai_enabled', { enabled: !g('ai_enabled', { enabled: true }).enabled })} className={`w-12 h-6 rounded-full relative transition-all ${g('ai_enabled', { enabled: true }).enabled ? 'bg-secondary' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${g('ai_enabled', { enabled: true }).enabled ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Confidence & Automated Triage Thresholds */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary">verified_user</span>
              <h3 className="font-bold text-slate-900">Confidence &amp; Automated Triage Thresholds</h3>
            </div>
            <span className="text-[10px] font-black text-slate-300">SECTION 02</span>
          </div>
          <div className="p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-600 mb-3">
                    <span>Auto-Dispatch Confidence Threshold</span>
                    <span className="text-secondary">{Number(g('auto_dispatch_threshold', { value: 95 }).value) || 95}%</span>
                  </div>
                  <input className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer" max="100" min="50" type="range" value={Number(g('auto_dispatch_threshold', { value: 95 }).value) || 95} onChange={(e) => set('auto_dispatch_threshold', { value: Number(e.target.value) })} style={{ accentColor: '#0051d5' }} />
                  <p className="text-[10px] text-slate-400 mt-2 italic">Threshold for fully autonomous unit assignment.</p>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-600 mb-3">
                    <span>Critical Incident Flag Threshold</span>
                    <span className="text-error font-bold">{Number(g('critical_threshold', { value: 85 }).value) || 85}%</span>
                  </div>
                  <input className="w-full h-2 bg-red-50 rounded-lg appearance-none cursor-pointer" max="100" min="50" type="range" value={Number(g('critical_threshold', { value: 85 }).value) || 85} onChange={(e) => set('critical_threshold', { value: Number(e.target.value) })} style={{ accentColor: '#0051d5' }} />
                  <p className="text-[10px] text-slate-400 mt-2 italic">Minimum confidence to auto-escalate to priority level.</p>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Low-Confidence Routing</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                      <input checked={g('low_confidence_routing', { mode: 'Force Manual Triage' }).mode === 'Force Manual Triage'} onChange={() => set('low_confidence_routing', { mode: 'Force Manual Triage' })} className="text-secondary focus:ring-secondary" name="low-conf" type="radio" />
                      <span className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">Force Manual Triage</span>
                        <span className="text-[10px] text-slate-500">Hold for human dispatcher review</span>
                      </span>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                      <input checked={g('low_confidence_routing', { mode: 'Force Manual Triage' }).mode === 'Route to Senior Officer'} onChange={() => set('low_confidence_routing', { mode: 'Route to Senior Officer' })} className="text-secondary focus:ring-secondary" name="low-conf" type="radio" />
                      <span className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">Route to Senior Officer</span>
                        <span className="text-[10px] text-slate-500">Directly alert supervisor queue</span>
                      </span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Max Auto-Dispatch Timeout</label>
                  <div className="flex items-center gap-3">
                    <input className="w-24 text-sm rounded-lg border-slate-200 focus:ring-secondary font-bold" type="number" value={Number(g('max_dispatch_timeout', { value: 30 }).value) || 30} onChange={(e) => set('max_dispatch_timeout', { value: Number(e.target.value) })} />
                    <span className="text-sm font-medium text-slate-500">Seconds</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Audit, Compliance & Data Retention */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary">gavel</span>
              <h3 className="font-bold text-slate-900">Audit, Compliance &amp; Data Retention</h3>
            </div>
            <span className="text-[10px] font-black text-slate-300">SECTION 03</span>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Audit Trail Logging Level</label>
                <select className="w-full text-sm rounded-lg border-slate-200 focus:ring-secondary bg-white font-medium" value={String(g('audit_level', { level: 'Verbose' }).level)} onChange={(e) => set('audit_level', { level: e.target.value })}>
                  <option>Minimal</option>
                  <option>Standard</option>
                  <option>Verbose</option>
                  <option>Diagnostic (Full Trace)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-2">Verbose includes reasoning steps and token breakdown.</p>
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800">PII Redaction before API Call</span>
                    <span className="text-[10px] text-slate-500">Strip names/phones from engine logs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold ${g('pii_redaction', { enabled: true }).enabled ? 'text-green-600' : 'text-slate-400'}`}>{g('pii_redaction', { enabled: true }).enabled ? 'ENABLED' : 'DISABLED'}</span>
                    <button type="button" onClick={() => set('pii_redaction', { enabled: !g('pii_redaction', { enabled: true }).enabled })} className={`w-10 h-5 rounded-full relative ${g('pii_redaction', { enabled: true }).enabled ? 'bg-secondary' : 'bg-slate-300'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full ${g('pii_redaction', { enabled: true }).enabled ? 'right-0.5' : 'left-0.5'}`}></div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={save} disabled={saving || loading} className="px-6 py-3 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-black transition-all disabled:opacity-60 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">save</span>
            {saving ? 'Saving…' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* AI Monitoring Sidebar */}
      <div className="col-span-12 lg:col-span-4 space-y-6">
        {/* AI Model Monitoring Widget */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">monitoring</span>
              <h4 className="text-sm font-bold text-slate-900">AI Model Monitoring</h4>
            </div>
            <span className="text-[10px] text-green-500 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> LIVE
            </span>
          </div>
          <div className="p-5">
            {loading ? (
              <div className="p-4 text-center text-xs text-slate-400">Loading telemetry…</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Success Rate</p>
                    <span className="text-xl font-bold text-green-600">{successRate}%</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Gemini Calls</p>
                    <span className="text-xl font-bold text-slate-900">{geminiClassified}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Fallback Runs</p>
                    <span className="text-xl font-bold text-slate-900">{fallbackClassified}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Actions</p>
                    <span className="text-xl font-bold text-slate-900">{total}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Latest Inference</h5>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 bg-green-100 text-green-700 rounded uppercase">Live</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <p className="text-[10px] text-slate-500 font-mono mb-2 uppercase tracking-tighter">Last AI Action:</p>
                    <p className="text-xs text-slate-300 italic leading-relaxed font-mono">
                      {audit[0]?.detail ?? 'No activity yet.'}
                    </p>
                    <p className="text-[9px] text-slate-500 mt-2 font-bold uppercase">{audit[0] ? new Date(audit[0].created_at).toLocaleString('en-PH') : '—'}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Recent AI Actions */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">history</span>
              <h4 className="text-sm font-bold text-slate-900">Recent AI Actions</h4>
            </div>
            <button type="button" onClick={load} className="text-[10px] font-bold text-secondary uppercase hover:underline">Refresh</button>
          </div>
          <div className="p-4 space-y-3">
            {audit.map((a) => (
              <div key={a.id} className={`p-3 rounded-lg border-l-2 ${a.action.includes('fallback') ? 'border-amber-500 bg-amber-50/20' : 'border-blue-500 bg-blue-50/20'} text-[11px]`}>
                <div className="flex justify-between text-[9px] text-slate-500 font-bold mb-1">
                  <span>{a.actor}</span>
                  <span>{new Date(a.created_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}</span>
                </div>
                <p className="text-slate-700 leading-snug">{a.detail}</p>
              </div>
            ))}
            {audit.length === 0 && <div className="p-3 text-center text-xs text-slate-400">No AI actions recorded yet.</div>}
          </div>
        </section>
      </div>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
