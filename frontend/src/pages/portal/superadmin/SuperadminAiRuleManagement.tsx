import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import Toast from '../../../components/Toast';

type RuleRow = {
  id: string;
  keywords: string[];
  category: string;
  action: string;
  priority: string;
  enabled: boolean;
};

type AuditRow = {
  id: string;
  actor: string;
  action: string;
  detail: string;
  created_at: string;
};

const CATEGORIES = ['Fire Hazard', 'Medical', 'Crime', 'Others'];

export default function SuperadminAiRuleManagement() {
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [search, setSearch] = useState('');
  const [newKeywords, setNewKeywords] = useState('');
  const [newCategory, setNewCategory] = useState('Crime');
  const [newAction, setNewAction] = useState('Dispatch');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchAll = async () => {
    const [ruleRes, cfgRes, auditRes] = await Promise.all([
      supabase.from('fallback_rules').select('*').order('created_at'),
      supabase.from('ai_config').select('key, value'),
      supabase.from('ai_audit_logs').select('id, actor, action, detail, created_at').order('created_at', { ascending: false }).limit(10),
    ]);
    const rules = (ruleRes.data ?? []) as RuleRow[];
    const cfg: Record<string, unknown> = {};
    (cfgRes.data ?? []).forEach((r) => {
      cfg[r.key] = r.value;
    });
    return {
      rules,
      enabled: (cfg.ai_enabled as { enabled?: boolean } | undefined)?.enabled ?? true,
      maxTokens: Number((cfg.max_tokens as { value?: number } | undefined)?.value) || 1024,
      audit: (auditRes.data ?? []) as AuditRow[],
    };
  };

  const load = async () => {
    setLoading(true);
    const { rules, enabled, maxTokens, audit } = await fetchAll();
    setRules(rules);
    setEnabled(enabled);
    setMaxTokens(maxTokens);
    setAudit(audit);
    setLoading(false);
  };

  useEffect(() => {
    void (async () => {
      const { rules, enabled, maxTokens, audit } = await fetchAll();
      setRules(rules);
      setEnabled(enabled);
      setMaxTokens(maxTokens);
      setAudit(audit);
      setLoading(false);
    })();
  }, []);

  const logAudit = async (action: string, detail: string) => {
    await supabase.from('ai_audit_logs').insert({ actor: 'Root_Admin', action, detail });
  };

  const toggleAI = async () => {
    setBusy(true);
    try {
      const next = !enabled;
      await supabase.from('ai_config').update({ value: { enabled: next } }).eq('key', 'ai_enabled');
      await logAudit('Toggled AI assistance', `AI assistance ${next ? 'enabled' : 'disabled'}.`);
      setEnabled(next);
      setToast({ type: 'success', message: `AI assistance ${next ? 'enabled' : 'disabled'}.` });
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Update failed.' });
    } finally {
      setBusy(false);
    }
  };

  const saveTokens = async () => {
    setBusy(true);
    try {
      await supabase.from('ai_config').update({ value: { value: maxTokens } }).eq('key', 'max_tokens');
      await logAudit('Updated AI response limit', `Max tokens set to ${maxTokens}.`);
      setToast({ type: 'success', message: `Max tokens set to ${maxTokens}.` });
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Update failed.' });
    } finally {
      setBusy(false);
    }
  };

  const addRule = async () => {
    const keywords = newKeywords.split(',').map((k) => k.trim()).filter(Boolean);
    if (!keywords.length) {
      setToast({ type: 'error', message: 'Enter at least one keyword.' });
      return;
    }
    setBusy(true);
    try {
      const { data } = await supabase
        .from('fallback_rules')
        .insert({ keywords, category: newCategory, action: newAction, priority: newPriority })
        .select('*')
        .single();
      await logAudit('Added fallback rule', `Rule for "${newCategory}" with keywords: ${keywords.join(', ')}.`);
      if (data) setRules((r) => [...r, data as RuleRow]);
      setNewKeywords('');
      setToast({ type: 'success', message: 'Fallback rule added.' });
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Add failed.' });
    } finally {
      setBusy(false);
    }
  };

  const toggleRule = async (rule: RuleRow) => {
    const next = !rule.enabled;
    const { error } = await supabase.from('fallback_rules').update({ enabled: next }).eq('id', rule.id);
    if (error) {
      setToast({ type: 'error', message: error.message });
      return;
    }
    await logAudit('Updated fallback rule', `${next ? 'Enabled' : 'Disabled'} rule for "${rule.category}".`);
    setRules((rs) => rs.map((r) => (r.id === rule.id ? { ...r, enabled: next } : r)));
  };

  const deleteRule = async (rule: RuleRow) => {
    const { error } = await supabase.from('fallback_rules').delete().eq('id', rule.id);
    if (error) {
      setToast({ type: 'error', message: error.message });
      return;
    }
    await logAudit('Deleted fallback rule', `Removed rule for "${rule.category}".`);
    setRules((rs) => rs.filter((r) => r.id !== rule.id));
    setToast({ type: 'success', message: 'Rule deleted.' });
  };

  const filtered = useMemo(
    () => rules.filter((r) => (search ? r.keywords.some((k) => k.toLowerCase().includes(search.toLowerCase())) || r.category.toLowerCase().includes(search.toLowerCase()) : true)),
    [rules, search],
  );

  return (
    <div className="space-y-6">
      {/* Top Row Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* SECTION 1: AI Configuration Management */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">settings_input_component</span>
              AI Configuration
            </h3>
            <span className="px-2.5 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded-full border border-green-100 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> {enabled ? 'ACTIVE / ONLINE' : 'PAUSED'}
            </span>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Google Gemini API integration</label>
              <div className="flex gap-2">
                <input className="flex-1 text-sm bg-slate-50 border-slate-200 rounded-lg px-4 py-2 text-slate-600 font-mono" readOnly type="password" value="sk-••••••••••••••••••••••••••••" />
                <button type="button" onClick={() => setToast({ type: 'success', message: 'Stored as Supabase Edge Function secret GEMINI_API_KEY.' })} className="px-3 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors">Manage API Keys</button>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-semibold text-slate-900">Enable/Disable AI Assistance</p>
                <p className="text-xs text-slate-500">Global toggle for AI-assisted classification</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold ${enabled ? 'text-secondary' : 'text-slate-400'}`}>{enabled ? 'ENABLED' : 'DISABLED'}</span>
                <button type="button" onClick={toggleAI} disabled={busy} className={`w-11 h-6 rounded-full relative transition-all disabled:opacity-60 ${enabled ? 'bg-secondary' : 'bg-slate-300'}`}>
                  <div className={`absolute top-[2px] w-5 h-5 bg-white rounded-full transition-all ${enabled ? 'right-[2px]' : 'left-[2px]'}`}></div>
                </button>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-500">AI Response Limits (Max Tokens)</label>
                <span className="text-xs font-bold text-secondary">{maxTokens} Tokens</span>
              </div>
              <input className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" max="4096" min="256" type="range" value={maxTokens} onChange={(e) => setMaxTokens(Number(e.target.value))} style={{ accentColor: '#0051d5' }} />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-400">256</span>
                <span className="text-[10px] text-slate-400">4096</span>
              </div>
            </div>
            <button type="button" onClick={saveTokens} disabled={busy} className="w-full py-2.5 bg-on-primary-fixed text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              <span className="material-symbols-outlined text-sm">tune</span>
              Save response limits
            </button>
          </div>
        </div>

        {/* SECTION 2: AI Model Monitoring */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-lg">monitoring</span>
            AI Model Monitoring
          </h3>
          {loading ? (
            <div className="p-6 text-center text-sm text-slate-400">Loading telemetry…</div>
          ) : (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Recent Actions</p>
                <span className="text-xl font-bold text-slate-900">{audit.length}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Fallback Rules</p>
                <span className="text-xl font-bold text-slate-900">{rules.length}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">AI Status</p>
                <span className={`text-xl font-bold ${enabled ? 'text-green-600' : 'text-slate-500'}`}>{enabled ? 'Online' : 'Paused'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Max Tokens</p>
                <span className="text-xl font-bold text-slate-900">{maxTokens}</span>
              </div>
            </div>
          )}
          <div className="mt-auto border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Latest Inference</span>
              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[9px] font-black rounded uppercase">Live</span>
            </div>
            <div className="p-4">
              <p className="text-xs text-slate-500 italic">{audit[0]?.detail ?? 'No activity yet.'}</p>
              {audit[0] && <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase">{new Date(audit[0].created_at).toLocaleString('en-PH')}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SECTION 3: Fallback Rule Engine Management */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">terminal</span>
              Fallback Rule Engine
            </h3>
          </div>
          <div className="mb-4 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border-slate-200 rounded-lg text-xs" placeholder="Search fallback rules..." type="text" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-2 text-[10px] font-bold text-slate-400 uppercase">Keywords</th>
                  <th className="py-2 text-[10px] font-bold text-slate-400 uppercase">Category</th>
                  <th className="py-2 text-[10px] font-bold text-slate-400 uppercase">Action</th>
                  <th className="py-2 text-[10px] font-bold text-slate-400 uppercase">On</th>
                  <th className="py-2 text-[10px] font-bold text-slate-400 uppercase"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((rule) => (
                  <tr key={rule.id} className={rule.enabled ? '' : 'opacity-50'}>
                    <td className="py-2.5 font-medium text-slate-600">{rule.keywords.slice(0, 3).join(', ')}{rule.keywords.length > 3 ? '…' : ''}</td>
                    <td className="py-2.5"><span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">{rule.category}</span></td>
                    <td className="py-2.5 text-secondary font-bold">{rule.action}</td>
                    <td className="py-2.5">
                      <button type="button" onClick={() => toggleRule(rule)} className={`w-8 h-4 rounded-full relative transition-all ${rule.enabled ? 'bg-secondary' : 'bg-slate-300'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${rule.enabled ? 'right-0.5' : 'left-0.5'}`}></div>
                      </button>
                    </td>
                    <td className="py-2.5 text-right">
                      <button type="button" onClick={() => deleteRule(rule)} className="text-slate-400 hover:text-error transition-colors"><span className="material-symbols-outlined text-sm">delete</span></button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-slate-400">No rules match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-auto pt-4 border-t border-slate-100 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input className="col-span-2 bg-slate-50 border-slate-200 rounded-lg px-3 py-1.5 text-xs" placeholder="Keywords (comma-separated), e.g. fire, smoke" type="text" value={newKeywords} onChange={(e) => setNewKeywords(e.target.value)} />
              <select className="bg-slate-50 border-slate-200 rounded-lg px-2 py-1.5 text-xs" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <select className="bg-slate-50 border-slate-200 rounded-lg px-2 py-1.5 text-xs" value={newAction} onChange={(e) => setNewAction(e.target.value)}>
                <option value="Dispatch">Dispatch</option>
                <option value="Hold">Hold</option>
                <option value="Verify">Verify</option>
              </select>
              <select className="col-span-2 bg-slate-50 border-slate-200 rounded-lg px-2 py-1.5 text-xs" value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
            <button type="button" onClick={addRule} disabled={busy} className="w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-black transition-colors disabled:opacity-60">+ Add New Fallback Rule</button>
          </div>
        </div>

        {/* SECTION 4: Incident Classification Settings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-lg">account_tree</span>
            Classification Settings
          </h3>
          <div className="space-y-4">
            {CATEGORIES.map((cat) => {
              const catRules = rules.filter((r) => r.category === cat);
              return (
                <div key={cat} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-lg">folder_open</span>
                    <span className="text-xs font-bold text-slate-700 uppercase">{cat}</span>
                  </div>
                  <div className="pl-6 space-y-1.5 border-l border-slate-100 ml-2">
                    {catRules.length === 0 && <span className="text-xs text-slate-400 italic">No rules configured.</span>}
                    {catRules.slice(0, 4).map((r) => (
                      <div key={r.id} className="flex items-center justify-between group">
                        <span className="text-xs text-slate-500">{r.keywords.slice(0, 2).join(', ')}{r.keywords.length > 2 ? '…' : ''}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${r.priority === 'CRITICAL' ? 'bg-red-50 text-red-700' : r.priority === 'HIGH' ? 'bg-red-50 text-red-700' : r.priority === 'LOW' ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-700'}`}>{r.priority}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-auto pt-6">
            <button type="button" onClick={() => setToast({ type: 'success', message: 'Severity is driven by the fallback rules above.' })} className="w-full py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">Manage Severity Rules</button>
          </div>
        </div>

        {/* SECTION 5: AI Audit Logs */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">history_edu</span>
              AI Audit Logs
            </h3>
            <button type="button" onClick={load} className="text-[10px] font-bold text-secondary uppercase hover:underline">Refresh</button>
          </div>
          <div className="space-y-4 overflow-y-auto max-h-[360px] nav-scroll">
            {audit.map((a) => (
              <div key={a.id} className="p-3 bg-slate-50 rounded-lg border-l-4 border-secondary">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[9px] font-bold text-slate-400">{new Date(a.created_at).toLocaleTimeString('en-PH')} | {a.actor}</span>
                  <span className="material-symbols-outlined text-sm text-slate-400">smart_toy</span>
                </div>
                <p className="text-[11px] text-slate-700 font-medium">{a.action}</p>
                <p className="text-[9px] text-slate-400 mt-1 italic">{a.detail}</p>
              </div>
            ))}
            {audit.length === 0 && <div className="p-4 text-center text-xs text-slate-400">No audit entries yet.</div>}
          </div>
        </div>
      </div>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
