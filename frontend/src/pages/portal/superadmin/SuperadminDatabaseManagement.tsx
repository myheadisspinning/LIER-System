export default function SuperadminDatabaseManagement() {
  return (
    <div className="flex flex-col gap-gutter">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-md mb-sm">
        <div className="flex flex-col gap-xs">
          <div className="flex items-center gap-sm text-secondary font-label-md text-label-md uppercase tracking-wider">
            <span className="material-symbols-outlined text-[18px]">database</span>
            <span>System Administration</span>
          </div>
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface tracking-tight">Database Management</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mt-xs">Monitor, maintain, secure, and optimize the Culiat system database infrastructure.</p>
        </div>
        <div className="flex flex-wrap items-center gap-sm mt-sm lg:mt-0">
          <button type="button" className="flex items-center justify-center gap-xs px-md py-sm rounded-lg border-[1.5px] border-secondary text-secondary font-label-md text-label-md hover:bg-secondary/5 transition-all shadow-sm">
            <span className="material-symbols-outlined text-[18px]">restore</span>
            Restore Backup
          </button>
          <button type="button" className="flex items-center justify-center gap-xs px-md py-sm rounded-lg bg-surface-variant text-on-surface font-label-md text-label-md hover:bg-secondary-fixed transition-all shadow-sm">
            <span className="material-symbols-outlined text-[18px]">speed</span>
            Optimize
          </button>
          <button type="button" className="flex items-center justify-center gap-xs px-md py-sm rounded-lg bg-gradient-to-r from-secondary to-primary-container text-on-primary font-label-md text-label-md hover:shadow-md transition-all shadow-sm hover:-translate-y-0.5">
            <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
            Create Backup
          </button>
        </div>
      </div>
      {/* Summary Cards (Bento Grid Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
        {/* Storage Card */}
        <div className="glass-panel rounded-2xl p-md flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-secondary/5 rounded-full blur-xl group-hover:bg-secondary/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-lg relative z-10">
            <div className="flex flex-col gap-1">
              <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Database Storage</span>
              <div className="flex items-baseline gap-xs">
                <span className="font-headline-lg text-headline-lg text-on-surface">1.8</span>
                <span className="font-label-md text-label-md text-on-surface-variant">/ 8 GB</span>
              </div>
            </div>
            <div className="p-sm bg-surface-container rounded-lg text-secondary">
              <span className="material-symbols-outlined text-[24px]">hard_drive</span>
            </div>
          </div>
          <div className="relative z-10 w-full h-2 bg-surface-variant rounded-full overflow-hidden">
            <div className="absolute left-0 top-0 h-full bg-secondary w-[22.5%] rounded-full shadow-[0_0_8px_rgba(49,107,243,0.6)]"></div>
          </div>
          <div className="flex justify-between mt-2 font-caption text-caption text-on-surface-variant relative z-10">
            <span>22.5% Used</span>
            <span className="text-secondary cursor-pointer hover:underline">Manage</span>
          </div>
        </div>
        {/* Total Tables Card */}
        <div className="bg-surface rounded-2xl p-md border border-outline-variant/20 premium-shadow flex flex-col justify-between hover:border-outline-variant/40 transition-colors">
          <div className="flex justify-between items-start mb-lg">
            <div className="flex flex-col gap-1">
              <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Total Tables</span>
              <span className="font-headline-lg text-headline-lg text-on-surface">32</span>
            </div>
            <div className="p-sm bg-surface-container rounded-lg text-on-primary-fixed-variant">
              <span className="material-symbols-outlined text-[24px]">table_chart</span>
            </div>
          </div>
          <div className="flex items-center gap-xs font-caption text-caption">
            <span className="flex items-center text-secondary">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              +2
            </span>
            <span className="text-on-surface-variant">this month</span>
          </div>
        </div>
        {/* Total Records Card */}
        <div className="bg-surface rounded-2xl p-md border border-outline-variant/20 premium-shadow flex flex-col justify-between hover:border-outline-variant/40 transition-colors">
          <div className="flex justify-between items-start mb-lg">
            <div className="flex flex-col gap-1">
              <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Total Records</span>
              <span className="font-headline-lg text-headline-lg text-on-surface">128,450</span>
            </div>
            <div className="p-sm bg-surface-container rounded-lg text-on-primary-fixed-variant">
              <span className="material-symbols-outlined text-[24px]">data_object</span>
            </div>
          </div>
          <div className="flex items-center gap-xs font-caption text-caption">
            <span className="flex items-center text-secondary">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              +12.4k
            </span>
            <span className="text-on-surface-variant">this week</span>
          </div>
        </div>
        {/* Database Status Card (Emergency Stylized) */}
        <div className="bg-surface rounded-2xl p-md border-l-4 border-l-[#10B981] border-y border-r border-outline-variant/20 premium-shadow flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-[#10B981]/5 rounded-bl-full pointer-events-none"></div>
          <div className="flex justify-between items-start mb-lg relative z-10">
            <div className="flex flex-col gap-1">
              <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">System Status</span>
              <span className="font-headline-lg text-headline-lg text-[#059669]">Healthy</span>
            </div>
            <div className="p-sm bg-[#10B981]/10 rounded-lg text-[#10B981]">
              <span className="material-symbols-outlined text-[24px]">check_circle</span>
            </div>
          </div>
          <div className="flex items-center gap-sm font-caption text-caption relative z-10">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></div>
              <span className="text-on-surface-variant">Uptime: 99.99%</span>
            </div>
            <div className="w-[1px] h-3 bg-outline-variant/30"></div>
            <span className="text-on-surface-variant">Ping: 12ms</span>
          </div>
        </div>
      </div>
      {/* Two Column Main Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-md">
        {/* Left Column (Broader) */}
        <div className="xl:col-span-2 flex flex-col gap-md">
          {/* Database Overview & Health (Bento Split) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            {/* Overview */}
            <div className="glass-panel rounded-2xl p-md flex flex-col h-full">
              <div className="flex items-center gap-sm mb-md">
                <span className="material-symbols-outlined text-secondary text-[20px]">info</span>
                <h2 className="font-headline-md text-headline-md text-on-surface">Configuration</h2>
              </div>
              <div className="grid grid-cols-2 gap-y-sm gap-x-md flex-grow">
                <div className="flex flex-col gap-xs">
                  <span className="font-caption text-caption text-on-surface-variant">Engine</span>
                  <span className="font-body-md text-body-md font-medium">Supabase PostgreSQL</span>
                </div>
                <div className="flex flex-col gap-xs">
                  <span className="font-caption text-caption text-on-surface-variant">Environment</span>
                  <span className="font-body-md text-body-md font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                    Production
                  </span>
                </div>
                <div className="flex flex-col gap-xs">
                  <span className="font-caption text-caption text-on-surface-variant">Version</span>
                  <span className="font-body-md text-body-md font-medium">15.1.0</span>
                </div>
                <div className="flex flex-col gap-xs">
                  <span className="font-caption text-caption text-on-surface-variant">Region</span>
                  <span className="font-body-md text-body-md font-medium">ap-southeast-1</span>
                </div>
                <div className="flex flex-col gap-xs">
                  <span className="font-caption text-caption text-on-surface-variant">Active Connections</span>
                  <span className="font-body-md text-body-md font-medium">42 / 100</span>
                </div>
                <div className="flex flex-col gap-xs">
                  <span className="font-caption text-caption text-on-surface-variant">Last Backup</span>
                  <span className="font-body-md text-body-md font-medium">2 hrs ago</span>
                </div>
              </div>
            </div>
            {/* Health Gauges */}
            <div className="bg-surface rounded-2xl border border-outline-variant/20 p-md premium-shadow flex flex-col h-full">
              <div className="flex justify-between items-center mb-md">
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-secondary text-[20px]">monitor_heart</span>
                  <h2 className="font-headline-md text-headline-md text-on-surface">Resource Health</h2>
                </div>
                <button type="button" className="text-secondary hover:text-secondary-fixed transition-colors font-label-md text-label-md">Details</button>
              </div>
              <div className="grid grid-cols-2 gap-md flex-grow content-center">
                {/* CPU Gauge */}
                <div className="flex flex-col items-center justify-center relative">
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-surface-variant" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                    <path className="text-secondary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="35, 100" strokeLinecap="round" strokeWidth="3"></path>
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="font-label-md text-label-md font-bold text-on-surface">35%</span>
                  </div>
                  <span className="font-caption text-caption text-on-surface-variant mt-2 text-center">CPU</span>
                </div>
                {/* Memory Gauge */}
                <div className="flex flex-col items-center justify-center relative">
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-surface-variant" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                    <path className="text-[#F59E0B]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="68, 100" strokeLinecap="round" strokeWidth="3"></path>
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="font-label-md text-label-md font-bold text-on-surface">68%</span>
                  </div>
                  <span className="font-caption text-caption text-on-surface-variant mt-2 text-center">Memory</span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between bg-surface-container-low p-2 rounded-lg">
                <span className="font-caption text-caption text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">timer</span>
                  Avg Query Time
                </span>
                <span className="font-label-md text-label-md text-on-surface">45ms</span>
              </div>
            </div>
          </div>
          {/* Database Tables */}
          <div className="bg-surface rounded-2xl border border-outline-variant/20 premium-shadow overflow-hidden flex flex-col">
            <div className="p-md border-b border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-sm bg-surface-container-lowest">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-secondary text-[20px]">table</span>
                <h2 className="font-headline-md text-headline-md text-on-surface">Database Tables</h2>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
                  <input className="pl-9 pr-4 py-2 bg-surface-container rounded-lg border-none text-body-md font-body-md focus:ring-2 focus:ring-secondary/50 w-full sm:w-64" placeholder="Search tables..." type="text" />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/20">
                    <th className="py-3 px-md font-caption text-caption text-on-surface-variant uppercase font-semibold">Table Name</th>
                    <th className="py-3 px-md font-caption text-caption text-on-surface-variant uppercase font-semibold text-right">Records</th>
                    <th className="py-3 px-md font-caption text-caption text-on-surface-variant uppercase font-semibold text-right hidden sm:table-cell">Size</th>
                    <th className="py-3 px-md font-caption text-caption text-on-surface-variant uppercase font-semibold hidden md:table-cell">Status</th>
                    <th className="py-3 px-md font-caption text-caption text-on-surface-variant uppercase font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 font-body-md text-body-md">
                  <tr className="hover:bg-surface-container/30 transition-colors group">
                    <td className="py-4 px-md">
                      <div className="flex items-center gap-sm">
                        <div className="w-8 h-8 rounded bg-secondary/10 flex items-center justify-center text-secondary">
                          <span className="material-symbols-outlined text-[16px]">description</span>
                        </div>
                        <span className="font-medium text-on-surface">incident_reports</span>
                      </div>
                    </td>
                    <td className="py-4 px-md text-right text-on-surface-variant">45,210</td>
                    <td className="py-4 px-md text-right text-on-surface-variant hidden sm:table-cell">450 MB</td>
                    <td className="py-4 px-md hidden md:table-cell">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#10B981]/10 text-[#10B981] font-caption text-caption">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                        Healthy
                      </span>
                    </td>
                    <td className="py-4 px-md text-right">
                      <button type="button" className="p-1 text-on-surface-variant hover:text-secondary transition-colors" title="View Details"><span className="material-symbols-outlined text-[18px]">visibility</span></button>
                      <button type="button" className="p-1 text-on-surface-variant hover:text-secondary transition-colors" title="Optimize"><span className="material-symbols-outlined text-[18px]">build</span></button>
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-container/30 transition-colors group">
                    <td className="py-4 px-md">
                      <div className="flex items-center gap-sm">
                        <div className="w-8 h-8 rounded bg-secondary/10 flex items-center justify-center text-secondary">
                          <span className="material-symbols-outlined text-[16px]">group</span>
                        </div>
                        <span className="font-medium text-on-surface">user_accounts</span>
                      </div>
                    </td>
                    <td className="py-4 px-md text-right text-on-surface-variant">12,054</td>
                    <td className="py-4 px-md text-right text-on-surface-variant hidden sm:table-cell">85 MB</td>
                    <td className="py-4 px-md hidden md:table-cell">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#10B981]/10 text-[#10B981] font-caption text-caption">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                        Healthy
                      </span>
                    </td>
                    <td className="py-4 px-md text-right">
                      <button type="button" className="p-1 text-on-surface-variant hover:text-secondary transition-colors"><span className="material-symbols-outlined text-[18px]">visibility</span></button>
                      <button type="button" className="p-1 text-on-surface-variant hover:text-secondary transition-colors"><span className="material-symbols-outlined text-[18px]">build</span></button>
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-container/30 transition-colors group">
                    <td className="py-4 px-md">
                      <div className="flex items-center gap-sm">
                        <div className="w-8 h-8 rounded bg-secondary/10 flex items-center justify-center text-secondary">
                          <span className="material-symbols-outlined text-[16px]">folder_special</span>
                        </div>
                        <span className="font-medium text-on-surface">evidence_files_meta</span>
                      </div>
                    </td>
                    <td className="py-4 px-md text-right text-on-surface-variant">8,930</td>
                    <td className="py-4 px-md text-right text-on-surface-variant hidden sm:table-cell">820 MB</td>
                    <td className="py-4 px-md hidden md:table-cell">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] font-caption text-caption">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span>
                        Warning
                      </span>
                    </td>
                    <td className="py-4 px-md text-right">
                      <button type="button" className="p-1 text-on-surface-variant hover:text-secondary transition-colors"><span className="material-symbols-outlined text-[18px]">visibility</span></button>
                      <button type="button" className="p-1 text-on-surface-variant hover:text-secondary transition-colors"><span className="material-symbols-outlined text-[18px]">build</span></button>
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-container/30 transition-colors group">
                    <td className="py-4 px-md">
                      <div className="flex items-center gap-sm">
                        <div className="w-8 h-8 rounded bg-secondary/10 flex items-center justify-center text-secondary">
                          <span className="material-symbols-outlined text-[16px]">history</span>
                        </div>
                        <span className="font-medium text-on-surface">system_logs</span>
                      </div>
                    </td>
                    <td className="py-4 px-md text-right text-on-surface-variant">62,256</td>
                    <td className="py-4 px-md text-right text-on-surface-variant hidden sm:table-cell">310 MB</td>
                    <td className="py-4 px-md hidden md:table-cell">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#10B981]/10 text-[#10B981] font-caption text-caption">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                        Healthy
                      </span>
                    </td>
                    <td className="py-4 px-md text-right">
                      <button type="button" className="p-1 text-on-surface-variant hover:text-secondary transition-colors"><span className="material-symbols-outlined text-[18px]">visibility</span></button>
                      <button type="button" className="p-1 text-on-surface-variant hover:text-secondary transition-colors"><span className="material-symbols-outlined text-[18px]">build</span></button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-outline-variant/20 bg-surface-container-low text-center">
              <button type="button" className="font-label-md text-label-md text-secondary hover:underline">View All 32 Tables</button>
            </div>
          </div>
        </div>
        {/* Right Column (Sidebar-esque) */}
        <div className="flex flex-col gap-md">
          {/* Security Status Card */}
          <div className="bg-primary-container text-on-primary rounded-2xl p-md shadow-lg relative overflow-hidden">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
            <div className="flex items-center gap-sm mb-md relative z-10">
              <span className="material-symbols-outlined text-secondary-fixed text-[20px]">shield</span>
              <h2 className="font-headline-md text-headline-md">Security Protocols</h2>
            </div>
            <div className="flex flex-col gap-sm relative z-10">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-[#10B981] text-[18px]">lock</span>
                  <span className="font-label-md text-label-md">SSL Encryption</span>
                </div>
                <span className="font-caption text-caption bg-[#10B981]/20 text-[#10B981] px-2 py-0.5 rounded text-xs">Active</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-[#10B981] text-[18px]">policy</span>
                  <span className="font-label-md text-label-md">Row Level Security</span>
                </div>
                <span className="font-caption text-caption bg-[#10B981]/20 text-[#10B981] px-2 py-0.5 rounded text-xs">Enforced</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-[#F59E0B] text-[18px]">receipt_long</span>
                  <span className="font-label-md text-label-md">Audit Logging</span>
                </div>
                <span className="font-caption text-caption bg-[#F59E0B]/20 text-[#F59E0B] px-2 py-0.5 rounded text-xs">Partial</span>
              </div>
            </div>
          </div>
          {/* Storage Distribution */}
          <div className="bg-surface rounded-2xl border border-outline-variant/20 p-md premium-shadow">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-md flex items-center gap-sm">
              <span className="material-symbols-outlined text-secondary text-[20px]">pie_chart</span>
              Storage Usage
            </h2>
            <div className="flex flex-col gap-4">
              {/* Item 1 */}
              <div>
                <div className="flex justify-between font-label-md text-label-md mb-1">
                  <span className="text-on-surface">Evidence Files</span>
                  <span className="text-on-surface-variant">820 MB</span>
                </div>
                <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
                  <div className="h-full bg-secondary w-[45%] rounded-full"></div>
                </div>
              </div>
              {/* Item 2 */}
              <div>
                <div className="flex justify-between font-label-md text-label-md mb-1">
                  <span className="text-on-surface">Incident Reports</span>
                  <span className="text-on-surface-variant">450 MB</span>
                </div>
                <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
                  <div className="h-full bg-secondary/80 w-[25%] rounded-full"></div>
                </div>
              </div>
              {/* Item 3 */}
              <div>
                <div className="flex justify-between font-label-md text-label-md mb-1">
                  <span className="text-on-surface">System Logs</span>
                  <span className="text-on-surface-variant">310 MB</span>
                </div>
                <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
                  <div className="h-full bg-secondary/60 w-[17%] rounded-full"></div>
                </div>
              </div>
              {/* Item 4 */}
              <div>
                <div className="flex justify-between font-label-md text-label-md mb-1">
                  <span className="text-on-surface">User Accounts</span>
                  <span className="text-on-surface-variant">85 MB</span>
                </div>
                <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
                  <div className="h-full bg-secondary/40 w-[5%] rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
          {/* Alerts & Activity */}
          <div className="bg-surface rounded-2xl border border-outline-variant/20 p-md premium-shadow flex-grow">
            <div className="flex justify-between items-center mb-md">
              <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
                <span className="material-symbols-outlined text-secondary text-[20px]">notifications_active</span>
                Recent Activity
              </h2>
            </div>
            <div className="relative border-l-2 border-surface-variant ml-3 pl-4 flex flex-col gap-6 py-2">
              {/* Alert Item */}
              <div className="relative">
                <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-[#F59E0B] ring-4 ring-surface"></div>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface">Storage Warning: evidence_files</span>
                  <span className="font-caption text-caption text-on-surface-variant">Table approaching 1GB limit. Consider archiving old records.</span>
                  <span className="font-caption text-caption text-on-surface-variant mt-1 text-xs">10 mins ago</span>
                </div>
              </div>
              {/* Activity Item */}
              <div className="relative">
                <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-secondary ring-4 ring-surface"></div>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface">Automated Backup Completed</span>
                  <span className="font-caption text-caption text-on-surface-variant">Daily snapshot saved to S3.</span>
                  <span className="font-caption text-caption text-on-surface-variant mt-1 text-xs">2 hours ago</span>
                </div>
              </div>
              {/* Activity Item */}
              <div className="relative">
                <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-surface-variant ring-4 ring-surface border border-outline-variant/30"></div>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface">Table Optimized: system_logs</span>
                  <span className="font-caption text-caption text-on-surface-variant">Reindexing freed up 15MB.</span>
                  <span className="font-caption text-caption text-on-surface-variant mt-1 text-xs">Yesterday, 14:30</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
