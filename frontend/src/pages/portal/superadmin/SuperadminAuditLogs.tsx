export default function SuperadminAuditLogs() {
  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Audit Logs</h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">Monitor system activities, security events, AI decisions, and administrative changes in real-time to ensure operational integrity.</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button type="button" className="px-4 py-2 border-1.5 border-secondary text-secondary hover:bg-secondary/5 rounded-lg font-label-md text-label-md transition-all flex items-center gap-2 bg-surface">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export Logs
          </button>
          <button type="button" className="px-4 py-2 bg-gradient-to-r from-secondary to-[#003ea8] text-on-primary rounded-lg font-label-md text-label-md shadow-sm hover:shadow-md transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">summarize</span>
            Generate Audit Report
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-surface-container-highest rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center gap-2 text-on-surface-variant mb-4">
              <span className="material-symbols-outlined text-[20px]">database</span>
              <span className="font-label-md text-label-md uppercase tracking-wider">Total Logs</span>
            </div>
            <div>
              <span className="font-display-lg text-display-lg text-on-surface">48,294</span>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-surface-container-low rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center gap-2 text-on-surface-variant mb-4">
              <span className="material-symbols-outlined text-[20px]">today</span>
              <span className="font-label-md text-label-md uppercase tracking-wider">Today's Activities</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="font-display-lg text-display-lg text-on-surface">1,245</span>
              <span className="font-caption text-caption text-secondary bg-secondary/10 px-2 py-1 rounded mb-2">+12% vs yesterday</span>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-5 border-l-4 border-l-error shadow-sm relative overflow-hidden">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center gap-2 text-error mb-4">
              <span className="material-symbols-outlined text-[20px]">security</span>
              <span className="font-label-md text-label-md uppercase tracking-wider font-bold">Security Events</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-display-lg text-display-lg text-on-surface">12</span>
              <span className="font-caption text-caption bg-error text-on-error px-3 py-1 rounded-full font-bold animate-pulse">Critical</span>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-secondary/5"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center gap-2 text-secondary mb-4">
              <span className="material-symbols-outlined text-[20px]">psychology</span>
              <span className="font-label-md text-label-md uppercase tracking-wider font-bold">AI Activities</span>
            </div>
            <div>
              <span className="font-display-lg text-display-lg text-on-surface">856</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex flex-col gap-4">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm flex flex-col">
            <div className="border-b border-outline-variant overflow-x-auto custom-scrollbar">
              <nav className="flex px-4 min-w-max">
                <button type="button" className="px-4 py-4 text-secondary font-label-md text-label-md border-b-2 border-secondary whitespace-nowrap">All Logs</button>
                <button type="button" className="px-4 py-4 text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md whitespace-nowrap">Authentication</button>
                <button type="button" className="px-4 py-4 text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md whitespace-nowrap">User Management</button>
                <button type="button" className="px-4 py-4 text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md whitespace-nowrap">Incident Management</button>
                <button type="button" className="px-4 py-4 text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md whitespace-nowrap">AI Activity</button>
                <button type="button" className="px-4 py-4 text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md whitespace-nowrap">Security Events</button>
              </nav>
            </div>
            <div className="p-4 bg-surface-bright flex flex-wrap items-center gap-3 rounded-b-2xl">
              <div className="relative flex-1 min-w-[200px]">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                <input className="w-full pl-9 pr-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary min-h-[40px]" placeholder="Search keywords..." type="text" />
              </div>
              <select className="py-2 pl-3 pr-8 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-secondary text-on-surface-variant min-h-[40px] appearance-none cursor-pointer">
                <option>Role: All</option>
                <option>Superadmin</option>
                <option>System</option>
              </select>
              <select className="py-2 pl-3 pr-8 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-secondary text-on-surface-variant min-h-[40px] appearance-none cursor-pointer">
                <option>Module: All</option>
                <option>Security</option>
                <option>AI Dispatch</option>
              </select>
              <button type="button" className="px-4 py-2 border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors font-label-md flex items-center gap-2 min-h-[40px]">
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                Date Range
              </button>
              <button type="button" className="px-3 py-2 text-secondary hover:bg-secondary/10 rounded-lg transition-colors font-label-md min-h-[40px]">
                Clear
              </button>
            </div>
          </div>
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="overflow-x-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Timestamp</th>
                    <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant">User</th>
                    <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant">Role</th>
                    <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant">Action</th>
                    <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant">Module</th>
                    <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant w-1/4">Description</th>
                    <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant text-center">Status</th>
                    <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
                  <tr className="hover:bg-surface-container-lowest/50 transition-colors group">
                    <td className="py-3 px-4 font-body-md text-body-md text-on-surface whitespace-nowrap">2024-05-20 14:25:12</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-surface-tint text-on-primary flex items-center justify-center font-caption text-[10px]">SYS</div>
                        <span className="font-body-md text-body-md text-on-surface">System Auto</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-body-md text-body-md text-on-surface-variant">System</td>
                    <td className="py-3 px-4 font-body-md text-body-md text-on-surface font-medium">Auto Dispatch</td>
                    <td className="py-3 px-4 font-body-md text-body-md text-on-surface-variant">AI Dispatch</td>
                    <td className="py-3 px-4 font-body-md text-caption text-on-surface-variant truncate max-w-[200px]" title="AI suggested dispatch based on audio keyword trigger 'fire'.">AI suggested dispatch based on audio keyword trigger 'fire'.</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-tertiary-fixed text-on-tertiary-fixed-variant">Warning</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button type="button" className="text-on-surface-variant hover:text-secondary p-1 rounded transition-colors" title="View Details">
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-container-lowest/50 transition-colors group">
                    <td className="py-3 px-4 font-body-md text-body-md text-on-surface whitespace-nowrap">2024-05-20 14:22:01</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <img alt="User" className="w-6 h-6 rounded-full" data-alt="User Avatar for John Doe, blue background, white JD initials, circular shape" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBre0J5IKnO2AMhbZci5L7yln2ha2bZ0hFqL_Q2f7doP3E5RtxaF47-62pSJjjFgnPdmaXhGDRg6EnW4AbV6bvKXViZRDQxqmFZBluIYZzuSc3OAqjCCMkrcLQ_o-s_bCrdrIjr-5_4iXLyAYAMa7jJao-y8eRUcf0W62S5cQjKR8AUQ3Mo9uUYGkSAeeQYEwGnPLgkCnfM7UPdrU08mpvxnPyCRAZhcLeO_xxMZfLChdIsGKR7H85G" />
                        <span className="font-body-md text-body-md text-on-surface">John Doe</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-body-md text-body-md text-on-surface-variant">Superadmin</td>
                    <td className="py-3 px-4 font-body-md text-body-md text-on-surface font-medium">Modified AI Rule</td>
                    <td className="py-3 px-4 font-body-md text-body-md text-on-surface-variant">AI Config</td>
                    <td className="py-3 px-4 font-body-md text-caption text-on-surface-variant truncate max-w-[200px]">Updated token limit for Gemini API.</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#dcfce7] text-[#166534]">Success</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button type="button" className="text-on-surface-variant hover:text-secondary p-1 rounded transition-colors" title="View Details">
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-error-container/20 transition-colors group bg-error-container/10">
                    <td className="py-3 px-4 font-body-md text-body-md text-on-surface whitespace-nowrap">2024-05-20 14:15:45</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-outline text-on-primary flex items-center justify-center font-caption text-[10px]">UNK</div>
                        <span className="font-body-md text-body-md text-on-surface text-error">Unknown IP</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-body-md text-body-md text-on-surface-variant">-</td>
                    <td className="py-3 px-4 font-body-md text-body-md text-error font-medium">Failed Login</td>
                    <td className="py-3 px-4 font-body-md text-body-md text-on-surface-variant">Security</td>
                    <td className="py-3 px-4 font-body-md text-caption text-on-surface-variant truncate max-w-[200px]">Multiple failed attempts from 192.168.1.45</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-error text-on-error">Failed</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button type="button" className="text-error hover:bg-error-container p-1 rounded transition-colors" title="Investigate">
                        <span className="material-symbols-outlined text-[20px]">lowercase</span>
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-container-lowest/50 transition-colors group">
                    <td className="py-3 px-4 font-body-md text-body-md text-on-surface whitespace-nowrap">2024-05-20 14:05:22</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <img alt="User" className="w-6 h-6 rounded-full" data-alt="User Avatar for Maria Santos, dark blue background, white MS initials, circular shape" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAiDOgkecv_SvRbu4mhhShgKPbJkK5P44TxgkCcMBEwLIWAraeefjp7HHO_1AY10Uvbh3Ljzp1_ExxMhvaRsN86hZRpzq_BJhPj2-NQ45BfXtLXBZ-pN2CHkbwW9dRq5x4lxqIICkXiZSC6h9W_yYUPWJHiDaMqFGhwBvxUCbMdurjYpKNzIzX_fKMFqHltCdAQPWpdR_cqiWyMQRWhV9P_q1m2QhBZqI2K6MqNqR9cBnITtVz-xV9K" />
                        <span className="font-body-md text-body-md text-on-surface">Maria Santos</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-body-md text-body-md text-on-surface-variant">Officer</td>
                    <td className="py-3 px-4 font-body-md text-body-md text-on-surface font-medium">Status Update</td>
                    <td className="py-3 px-4 font-body-md text-body-md text-on-surface-variant">Incident Mgt</td>
                    <td className="py-3 px-4 font-body-md text-caption text-on-surface-variant truncate max-w-[200px]">Marked Case CAS-501 as 'Resolved'.</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#dcfce7] text-[#166534]">Success</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button type="button" className="text-on-surface-variant hover:text-secondary p-1 rounded transition-colors" title="View Details">
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="border-t border-outline-variant p-4 flex items-center justify-between bg-surface-container-lowest">
              <span className="font-caption text-caption text-on-surface-variant">Showing 1-4 of 48,294</span>
              <div className="flex items-center gap-2">
                <button type="button" className="p-1 rounded hover:bg-surface-container-low text-outline-variant disabled:opacity-50" disabled>
                  <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                </button>
                <button type="button" className="w-8 h-8 rounded bg-secondary text-on-secondary font-label-md text-label-md flex items-center justify-center">1</button>
                <button type="button" className="w-8 h-8 rounded hover:bg-surface-container-low text-on-surface font-label-md text-label-md flex items-center justify-center">2</button>
                <button type="button" className="w-8 h-8 rounded hover:bg-surface-container-low text-on-surface font-label-md text-label-md flex items-center justify-center">3</button>
                <span className="text-on-surface-variant">...</span>
                <button type="button" className="p-1 rounded hover:bg-surface-container-low text-on-surface-variant">
                  <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-bl-full pointer-events-none"></div>
            <h3 className="font-headline-md text-headline-md-mobile text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">memory</span>
              AI Performance
            </h3>
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center pb-3 border-b border-outline-variant border-dashed">
                <span className="font-body-md text-body-md text-on-surface-variant">Total AI Requests</span>
                <span className="font-label-md text-label-md text-on-surface">8,420</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-outline-variant border-dashed">
                <span className="font-body-md text-body-md text-on-surface-variant">Gemini Responses</span>
                <div className="flex items-center gap-1 text-[#166534]">
                  <span className="font-label-md text-label-md">100% Success</span>
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                </div>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-outline-variant border-dashed">
                <span className="font-body-md text-body-md text-on-surface-variant">Rule Activations</span>
                <span className="font-label-md text-label-md text-on-surface">45</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-body-md text-body-md text-on-surface-variant">Admin Overrides</span>
                <span className="font-label-md text-label-md bg-tertiary-fixed text-on-tertiary-fixed-variant px-2 py-0.5 rounded">3</span>
              </div>
            </div>
            <button type="button" className="w-full mt-5 py-2 text-secondary border border-secondary rounded-lg font-label-md text-label-md hover:bg-secondary/5 transition-colors">
              View Detailed AI Logs
            </button>
          </div>
          <div className="bg-surface-container-lowest rounded-2xl border border-error/30 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-error-container/50 px-5 py-3 border-b border-error/20 flex items-center gap-2 text-error">
              <span className="material-symbols-outlined animate-pulse">notification_important</span>
              <h3 className="font-label-md text-label-md uppercase tracking-wider font-bold">Active Security Alerts</h3>
            </div>
            <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar">
              <div className="bg-surface p-3 rounded-lg border-l-2 border-error flex items-start gap-3">
                <span className="material-symbols-outlined text-error text-[20px] mt-0.5">login</span>
                <div>
                  <p className="font-caption text-caption text-on-surface font-medium mb-1">Failed Login Attempt</p>
                  <p className="font-caption text-[11px] text-on-surface-variant">Multiple attempts from IP: <span className="font-mono bg-surface-container-low px-1 rounded">192.168.1.45</span></p>
                  <span className="text-[10px] text-outline mt-1 block">2 mins ago</span>
                </div>
              </div>
              <div className="bg-surface p-3 rounded-lg border-l-2 border-error flex items-start gap-3">
                <span className="material-symbols-outlined text-error text-[20px] mt-0.5">gpp_bad</span>
                <div>
                  <p className="font-caption text-caption text-on-surface font-medium mb-1">Unauthorized Access Attempt</p>
                  <p className="font-caption text-[11px] text-on-surface-variant">Target: <span className="font-mono bg-surface-container-low px-1 rounded">/ai-config</span> by Officer role.</p>
                  <span className="text-[10px] text-outline mt-1 block">15 mins ago</span>
                </div>
              </div>
              <div className="bg-surface p-3 rounded-lg border-l-2 border-tertiary-fixed-dim flex items-start gap-3">
                <span className="material-symbols-outlined text-tertiary-fixed-dim text-[20px] mt-0.5">warning</span>
                <div>
                  <p className="font-caption text-caption text-on-surface font-medium mb-1">Password brute-force detected</p>
                  <p className="font-caption text-[11px] text-on-surface-variant">Target Sector: 4. Account locked temporarily.</p>
                  <span className="text-[10px] text-outline mt-1 block">1 hour ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="h-8"></div>
    </div>
  );
}
