export default function SuperadminAiConfig() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">settings_input_component</span>
              AI Configuration
            </h3>
            <span className="px-2.5 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded-full border border-green-100 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> ACTIVE / ONLINE (100% UPTIME)
            </span>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Google Gemini API integration</label>
              <div className="flex gap-2">
                <input className="flex-1 text-sm bg-slate-50 border-slate-200 rounded-lg px-4 py-2 text-slate-600 font-mono" readOnly type="password" value="sk-gemini-••••••••••••••••••••3a7f" />
                <button type="button" className="px-3 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors">Manage API Keys</button>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-semibold text-slate-900">Enable/Disable AI Assistance</p>
                <p className="text-xs text-slate-500">Global toggle for AI-assisted classification</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input defaultChecked className="sr-only peer" type="checkbox" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
              </label>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-500">AI Response Limits (Max Tokens)</label>
                <span className="text-xs font-bold text-secondary">1024 Tokens</span>
              </div>
              <input className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-secondary" max="4096" min="256" type="range" value="1024" />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-400">256</span>
                <span className="text-[10px] text-slate-400">4096</span>
              </div>
            </div>
            <button type="button" className="w-full py-2.5 bg-on-primary-fixed text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">tune</span>
              Configure AI usage settings
            </button>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-lg">monitoring</span>
            AI Model Monitoring
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Success Rate</p>
              <div className="flex items-end justify-between">
                <span className="text-xl font-bold text-green-600">99.8%</span>
                <div className="h-6 w-16 flex items-end gap-0.5 pb-1">
                  <div className="w-1 bg-green-500 h-2 rounded-t-sm"></div>
                  <div className="w-1 bg-green-500 h-3 rounded-t-sm"></div>
                  <div className="w-1 bg-green-500 h-4 rounded-t-sm"></div>
                  <div className="w-1 bg-green-500 h-5 rounded-t-sm"></div>
                  <div className="w-1 bg-green-500 h-6 rounded-t-sm"></div>
                </div>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Avg Response</p>
              <div className="flex items-end justify-between">
                <span className="text-xl font-bold text-slate-900">1.2s</span>
                <div className="h-6 w-16 flex items-end gap-1 pb-1">
                  <div className="w-2 bg-secondary h-4 rounded-t-sm"></div>
                  <div className="w-2 bg-secondary h-2 rounded-t-sm"></div>
                  <div className="w-2 bg-secondary h-5 rounded-t-sm"></div>
                  <div className="w-2 bg-secondary h-3 rounded-t-sm"></div>
                </div>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Requests</p>
              <div className="flex items-end justify-between">
                <span className="text-xl font-bold text-slate-900">5,432</span>
                <div className="w-6 h-6 border-4 border-slate-200 border-t-secondary rounded-full"></div>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">AI Uptime</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-slate-900 tracking-tighter">99.9%</span>
                <span className="material-symbols-outlined text-green-500 text-sm">trending_up</span>
              </div>
            </div>
          </div>
          <div className="mt-auto border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Real-time Inference Preview</span>
              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[9px] font-black rounded uppercase">Success</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-xs">
                <span className="font-bold text-slate-400 uppercase block mb-1">User Report:</span>
                <p className="text-slate-700 bg-slate-50 p-2 rounded italic">"Someone stole my motorcycle from the parking lot."</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="flex flex-col"><span className="font-bold text-slate-400 uppercase">Category</span><span className="font-semibold text-slate-900">Theft</span></div>
                <div className="flex flex-col"><span className="font-bold text-slate-400 uppercase">Priority</span><span className="font-semibold text-red-600">High</span></div>
                <div className="flex flex-col"><span className="font-bold text-slate-400 uppercase">Status</span><span className="font-semibold text-green-600">Successful</span></div>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Suggested Action:</span>
                <span className="text-xs font-bold text-secondary">Dispatch officer</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">terminal</span>
              Fallback Rule Engine
            </h3>
            <button type="button" className="p-1.5 text-secondary hover:bg-slate-50 rounded transition-colors">
              <span className="material-symbols-outlined">add_box</span>
            </button>
          </div>
          <div className="mb-4 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border-slate-200 rounded-lg text-xs" placeholder="Search fallback rules..." type="text" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-2 text-[10px] font-bold text-slate-400 uppercase">Keywords</th>
                  <th className="py-2 text-[10px] font-bold text-slate-400 uppercase">Category</th>
                  <th className="py-2 text-[10px] font-bold text-slate-400 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <tr className="hover:bg-slate-50 cursor-pointer">
                  <td className="py-3 font-medium text-slate-600">stolen, missing...</td>
                  <td className="py-3"><span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">Theft</span></td>
                  <td className="py-3 text-secondary font-bold">Dispatch</td>
                </tr>
                <tr className="hover:bg-slate-50 cursor-pointer">
                  <td className="py-3 font-medium text-slate-600">fire, smoke...</td>
                  <td className="py-3"><span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded">Fire</span></td>
                  <td className="py-3 text-secondary font-bold">Emergency</td>
                </tr>
                <tr className="hover:bg-slate-50 cursor-pointer">
                  <td className="py-3 font-medium text-slate-600">loud, noise...</td>
                  <td className="py-3"><span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">Noise</span></td>
                  <td className="py-3 text-secondary font-bold">Investigate</td>
                </tr>
              </tbody>
            </table>
          </div>
          <button type="button" className="mt-auto pt-4 text-[10px] font-bold text-slate-400 uppercase text-center hover:text-secondary transition-colors">+ Add New Fallback Rule</button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-lg">account_tree</span>
            Classification Settings
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-lg">folder_open</span>
                <span className="text-xs font-bold text-slate-700 uppercase">Crime</span>
              </div>
              <div className="pl-6 space-y-1.5 border-l border-slate-100 ml-2">
                <div className="flex items-center justify-between group">
                  <span className="text-xs text-slate-500">Theft</span>
                  <span className="px-1.5 py-0.5 bg-red-50 text-red-700 text-[9px] font-bold rounded">HIGH SEVERITY</span>
                </div>
                <div className="flex items-center justify-between group">
                  <span className="text-xs text-slate-500">Assault</span>
                  <span className="px-1.5 py-0.5 bg-red-50 text-red-700 text-[9px] font-bold rounded">CRITICAL</span>
                </div>
                <div className="flex items-center justify-between group">
                  <span className="text-xs text-slate-500">Robbery</span>
                  <span className="px-1.5 py-0.5 bg-red-50 text-red-700 text-[9px] font-bold rounded">CRITICAL</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-lg">emergency_home</span>
                <span className="text-xs font-bold text-slate-700 uppercase">Emergency</span>
              </div>
              <div className="pl-6 space-y-1.5 border-l border-slate-100 ml-2">
                <div className="flex items-center justify-between group">
                  <span className="text-xs text-slate-500">Fire / Accident</span>
                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-bold rounded">AUTO-DISPATCH</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-lg">groups</span>
                <span className="text-xs font-bold text-slate-700 uppercase">Community</span>
              </div>
              <div className="pl-6 space-y-1.5 border-l border-slate-100 ml-2">
                <div className="flex items-center justify-between group">
                  <span className="text-xs text-slate-500">Noise / Disturbance</span>
                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[9px] font-bold rounded">LOW PRIORITY</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-auto pt-6">
            <button type="button" className="w-full py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">Manage Severity Rules</button>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">history_edu</span>
              AI Audit Logs
            </h3>
            <a className="text-[10px] font-bold text-secondary uppercase hover:underline" href="#">Full Audit</a>
          </div>
          <div className="space-y-4 overflow-y-auto max-h-[300px] nav-scroll">
            <div className="p-3 bg-slate-50 rounded-lg border-l-4 border-secondary">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[9px] font-bold text-slate-400">14:22:01 | Root_Admin</span>
                <span className="material-symbols-outlined text-sm text-slate-400">visibility</span>
              </div>
              <p className="text-[11px] text-slate-700 font-medium">Modified API Response Limit from 512 to 1024 tokens.</p>
              <p className="text-[9px] text-slate-400 mt-1 italic">Reason: Performance optimization for complex reports.</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border-l-4 border-green-500">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[9px] font-bold text-slate-400">14:15:30 | AI_System</span>
                <span className="material-symbols-outlined text-sm text-slate-400">smart_toy</span>
              </div>
              <p className="text-[11px] text-slate-700 font-medium">Successfully classified Report #9422 as "Theft (High Priority)".</p>
              <p className="text-[9px] text-slate-400 mt-1 italic">Action: AI suggestion reviewed and approved by Officer.</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border-l-4 border-amber-500">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[9px] font-bold text-slate-400">13:50:12 | Root_Admin</span>
                <span className="material-symbols-outlined text-sm text-slate-400">edit_note</span>
              </div>
              <p className="text-[11px] text-slate-700 font-medium">Updated Fallback Rule for "Fire" category.</p>
              <p className="text-[9px] text-slate-400 mt-1 italic">Action: Added keywords 'ignition' and 'combustion'.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
