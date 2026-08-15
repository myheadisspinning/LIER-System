export default function SuperadminSecurityCenter() {
  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h2 className="text-display-lg-mobile md:text-display-lg font-display-lg-mobile md:font-display-lg text-on-surface mb-2">Security Center</h2>
          <p className="text-body-lg font-body-lg text-on-surface-variant">Monitor security threats, access activities, system risks, and protection status.</p>
        </div>
        <div className="flex gap-3">
          <button type="button" className="border-[1.5px] border-secondary text-secondary hover:bg-secondary/5 transition-colors px-6 py-2.5 rounded-lg text-label-md font-label-md flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">download</span>
            Generate Security Report
          </button>
          <button type="button" className="bg-gradient-to-r from-secondary to-[#003ea8] text-white shadow-md hover:shadow-lg transition-all px-6 py-2.5 rounded-lg text-label-md font-label-md flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">radar</span>
            Run Security Scan
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <span className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider text-xs">Security Status</span>
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
            </div>
          </div>
          <div>
            <span className="text-headline-md font-headline-md text-green-600 font-bold block">Secured</span>
            <span className="text-caption font-caption text-on-surface-variant mt-1 block">Last scan: 2 mins ago</span>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <span className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider text-xs">Active Threats</span>
            <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant text-sm">bug_report</span>
            </div>
          </div>
          <div>
            <span className="text-headline-md font-headline-md text-on-surface font-bold block">0</span>
            <span className="text-caption font-caption text-green-600 mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">trending_down</span> -2 from yesterday</span>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between border-l-4 border-l-orange-500">
          <div className="flex justify-between items-start mb-4">
            <span className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider text-xs">Failed Logins</span>
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-orange-600 text-sm">warning</span>
            </div>
          </div>
          <div>
            <span className="text-headline-md font-headline-md text-orange-600 font-bold block">12</span>
            <span className="text-caption font-caption text-orange-600 mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">trending_up</span> +3 in last hour</span>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <span className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider text-xs">Active Sessions</span>
            <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary text-sm">person</span>
            </div>
          </div>
          <div>
            <span className="text-headline-md font-headline-md text-on-surface font-bold block">45</span>
            <span className="text-caption font-caption text-on-surface-variant mt-1 block">Across 3 departments</span>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <span className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider text-xs">API Health</span>
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-teal-600 text-sm">check_circle</span>
            </div>
          </div>
          <div>
            <span className="text-headline-md font-headline-md text-teal-600 font-bold block">99.9%</span>
            <span className="text-caption font-caption text-on-surface-variant mt-1 block">All systems operational</span>
          </div>
        </div>
      </div>
      <div className="border-b border-outline-variant mb-6 flex overflow-x-auto hide-scrollbar">
        <button type="button" className="px-6 py-3 text-label-md font-label-md text-secondary font-bold border-b-2 border-secondary whitespace-nowrap">Security Overview</button>
        <button type="button" className="px-6 py-3 text-label-md font-label-md text-on-surface-variant hover:text-secondary hover:bg-surface-variant/20 transition-all whitespace-nowrap">Threat Alerts</button>
        <button type="button" className="px-6 py-3 text-label-md font-label-md text-on-surface-variant hover:text-secondary hover:bg-surface-variant/20 transition-all whitespace-nowrap">Login Monitoring</button>
        <button type="button" className="px-6 py-3 text-label-md font-label-md text-on-surface-variant hover:text-secondary hover:bg-surface-variant/20 transition-all whitespace-nowrap">Session Management</button>
        <button type="button" className="px-6 py-3 text-label-md font-label-md text-on-surface-variant hover:text-secondary hover:bg-surface-variant/20 transition-all whitespace-nowrap">Account Security</button>
        <button type="button" className="px-6 py-3 text-label-md font-label-md text-on-surface-variant hover:text-secondary hover:bg-surface-variant/20 transition-all whitespace-nowrap">AI Security</button>
        <button type="button" className="px-6 py-3 text-label-md font-label-md text-on-surface-variant hover:text-secondary hover:bg-surface-variant/20 transition-all whitespace-nowrap">API Monitoring</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-2xl overflow-hidden flex flex-col h-[400px]">
            <div className="p-5 border-b border-outline-variant bg-surface-container-lowest/50 flex justify-between items-center">
              <h3 className="text-headline-md font-headline-md text-on-surface text-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">notifications_active</span>
                Recent Security Alerts
              </h3>
              <button type="button" className="text-label-md font-label-md text-secondary hover:underline">View All</button>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low/50 sticky top-0 backdrop-blur-sm z-10">
                  <tr>
                    <th className="py-3 px-5 text-label-md font-label-md text-on-surface-variant text-xs uppercase tracking-wider border-b border-outline-variant">Severity</th>
                    <th className="py-3 px-5 text-label-md font-label-md text-on-surface-variant text-xs uppercase tracking-wider border-b border-outline-variant">Description</th>
                    <th className="py-3 px-5 text-label-md font-label-md text-on-surface-variant text-xs uppercase tracking-wider border-b border-outline-variant">Target</th>
                    <th className="py-3 px-5 text-label-md font-label-md text-on-surface-variant text-xs uppercase tracking-wider border-b border-outline-variant">Time</th>
                    <th className="py-3 px-5 text-label-md font-label-md text-on-surface-variant text-xs uppercase tracking-wider border-b border-outline-variant">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-body-md font-body-md text-on-surface divide-y divide-outline-variant/30">
                  <tr className="hover:bg-surface-variant/10 transition-colors">
                    <td className="py-3 px-5">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-red-100 text-error">Critical</span>
                    </td>
                    <td className="py-3 px-5">Brute force attempt detected</td>
                    <td className="py-3 px-5">Admin Portal (Unit 4)</td>
                    <td className="py-3 px-5 text-on-surface-variant text-sm">10 mins ago</td>
                    <td className="py-3 px-5">
                      <div className="flex gap-2">
                        <button type="button" className="p-1.5 text-secondary hover:bg-secondary/10 rounded transition-colors" title="Investigate"><span className="material-symbols-outlined text-sm">search</span></button>
                        <button type="button" className="p-1.5 text-error hover:bg-error/10 rounded transition-colors" title="Block IP"><span className="material-symbols-outlined text-sm">block</span></button>
                      </div>
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-variant/10 transition-colors">
                    <td className="py-3 px-5">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-orange-100 text-orange-700">High</span>
                    </td>
                    <td className="py-3 px-5">Suspicious login location</td>
                    <td className="py-3 px-5">User: J. Doe</td>
                    <td className="py-3 px-5 text-on-surface-variant text-sm">1 hour ago</td>
                    <td className="py-3 px-5">
                      <div className="flex gap-2">
                        <button type="button" className="p-1.5 text-secondary hover:bg-secondary/10 rounded transition-colors" title="Investigate"><span className="material-symbols-outlined text-sm">search</span></button>
                        <button type="button" className="p-1.5 text-secondary hover:bg-secondary/10 rounded transition-colors" title="Force Logout"><span className="material-symbols-outlined text-sm">logout</span></button>
                      </div>
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-variant/10 transition-colors">
                    <td className="py-3 px-5">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-700">Medium</span>
                    </td>
                    <td className="py-3 px-5">Multiple failed MFA attempts</td>
                    <td className="py-3 px-5">User: M. Smith</td>
                    <td className="py-3 px-5 text-on-surface-variant text-sm">3 hours ago</td>
                    <td className="py-3 px-5">
                      <div className="flex gap-2">
                        <button type="button" className="p-1.5 text-secondary hover:bg-secondary/10 rounded transition-colors" title="Investigate"><span className="material-symbols-outlined text-sm">search</span></button>
                        <button type="button" className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors" title="Resolve"><span className="material-symbols-outlined text-sm">check</span></button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-headline-md font-headline-md text-on-surface text-lg flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-secondary">bolt</span>
              Quick Security Actions
            </h3>
            <div className="space-y-3">
              <button type="button" className="w-full flex items-center gap-3 p-3 rounded-lg border border-outline-variant hover:border-secondary hover:bg-surface-container-low transition-all text-left group">
                <div className="w-8 h-8 rounded-full bg-error-container text-on-error-container flex items-center justify-center group-hover:bg-error group-hover:text-on-error transition-colors">
                  <span className="material-symbols-outlined text-sm">lock</span>
                </div>
                <div>
                  <span className="block text-label-md font-label-md text-on-surface">Lock Specific Account</span>
                  <span className="block text-caption font-caption text-on-surface-variant">Prevent access immediately</span>
                </div>
              </button>
              <button type="button" className="w-full flex items-center gap-3 p-3 rounded-lg border border-outline-variant hover:border-secondary hover:bg-surface-container-low transition-all text-left group">
                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-sm">person_off</span>
                </div>
                <div>
                  <span className="block text-label-md font-label-md text-on-surface">Terminate Sessions</span>
                  <span className="block text-caption font-caption text-on-surface-variant">Force logout all users</span>
                </div>
              </button>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-headline-md font-headline-md text-on-surface text-lg flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-secondary">router</span>
              System Integrations
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary">psychology</span>
                  <span className="text-body-md font-body-md text-on-surface font-medium">Gemini AI Engine</span>
                </div>
                <span className="flex items-center gap-1 text-caption font-caption text-green-600 bg-green-50 px-2 py-1 rounded-full"><span className="w-2 h-2 rounded-full bg-green-500"></span> Online</span>
              </div>
              <div className="w-full bg-surface-variant rounded-full h-1.5">
                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: "100%" }}></div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary">database</span>
                  <span className="text-body-md font-body-md text-on-surface font-medium">Supabase Auth</span>
                </div>
                <span className="flex items-center gap-1 text-caption font-caption text-green-600 bg-green-50 px-2 py-1 rounded-full"><span className="w-2 h-2 rounded-full bg-green-500"></span> Online</span>
              </div>
              <div className="w-full bg-surface-variant rounded-full h-1.5">
                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: "98%" }}></div>
              </div>
              <div className="pt-4 border-t border-outline-variant/50 flex justify-between items-center">
                <span className="text-label-md font-label-md text-on-surface-variant">Strict Privacy Mode</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input defaultChecked className="sr-only peer" type="checkbox" value="" />
                  <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
