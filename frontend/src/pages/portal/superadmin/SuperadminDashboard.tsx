export default function SuperadminDashboard() {
  return (
    <div className="-m-8 bg-surface-container-low text-on-surface font-body min-h-[calc(100vh-64px)] px-10 py-8 relative overflow-hidden">
      <div className="relative space-y-8">
        {/* ============ SYSTEM INFRASTRUCTURE KPI ============ */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-headline-md text-headline-md font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">dns</span>
              System Infrastructure Overview
            </h3>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-on-surface-variant uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-success-green animate-pulse"></span> Real-time Monitoring
            </span>
          </div>
          <div className="grid grid-cols-12 gap-6">
            {/* Server Status */}
            <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-6 rounded-2xl border border-border-subtle border-t-2 border-t-cc-emerald shadow-sm">
              <div className="flex justify-between items-start mb-5">
                <p className="text-sm font-medium text-on-surface-variant">Server Status</p>
                <span className="px-2 py-1 bg-success-green/10 text-success-green text-[10px] font-bold rounded uppercase border border-success-green/25">Online</span>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-on-surface-variant">CPU Load</span>
                    <span className="font-semibold text-on-surface">24%</span>
                  </div>
                  <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden"><div className="bg-tertiary h-full" style={{ width: '24%' }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-on-surface-variant">Memory</span>
                    <span className="font-semibold text-on-surface">4.2 / 16 GB</span>
                  </div>
                  <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden"><div className="bg-tertiary h-full" style={{ width: '35%' }}></div></div>
                </div>
              </div>
            </div>
            {/* Database Connectivity */}
            <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-6 rounded-2xl border border-border-subtle border-t-2 border-t-cc-blue shadow-sm">
              <div className="flex justify-between items-start mb-5">
                <p className="text-sm font-medium text-on-surface-variant">Database Connectivity</p>
                <span className="material-symbols-outlined text-on-surface-variant">database</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Active Pools</span>
                  <span className="font-semibold text-on-surface">128</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Query Latency</span>
                  <span className="font-semibold text-success-green">12ms</span>
                </div>
                <div className="mt-4 pt-4 border-t border-border-subtle flex items-center gap-2 text-[10px] text-on-surface-variant font-bold uppercase">
                  <span className="w-2 h-2 bg-success-green rounded-full"></span> Stable Connection
                </div>
              </div>
            </div>
            {/* Network Traffic */}
            <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-6 rounded-2xl border border-border-subtle border-t-2 border-t-cc-teal shadow-sm">
              <div className="flex justify-between items-start mb-5">
                <p className="text-sm font-medium text-on-surface-variant">Network Traffic</p>
                <span className="material-symbols-outlined text-on-surface-variant">show_chart</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface-variant">Inbound</span>
                  <span className="font-bold text-on-surface">45.2 Mb/s</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface-variant">Outbound</span>
                  <span className="font-bold text-on-surface">12.8 Mb/s</span>
                </div>
                <div className="h-10 flex items-end gap-1 mt-2">
                  <div className="flex-1 bg-tertiary/20 h-4 rounded-t-sm"></div>
                  <div className="flex-1 bg-tertiary/40 h-6 rounded-t-sm"></div>
                  <div className="flex-1 bg-tertiary/60 h-8 rounded-t-sm"></div>
                  <div className="flex-1 bg-tertiary h-10 rounded-t-sm"></div>
                  <div className="flex-1 bg-tertiary/80 h-7 rounded-t-sm"></div>
                </div>
              </div>
            </div>
            {/* Security Level */}
            <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-6 rounded-2xl border border-border-subtle border-t-2 border-t-cc-accent shadow-sm">
              <div className="flex justify-between items-start mb-5">
                <p className="text-sm font-medium text-on-surface-variant">Security Level</p>
                <span className="material-symbols-outlined text-secondary">verified_user</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Threat Level</span>
                  <span className="font-bold text-success-green">NORMAL</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">SSL Cert</span>
                  <span className="text-on-surface-variant">Valid (240d)</span>
                </div>
                <div className="mt-4 pt-4 border-t border-border-subtle">
                  <button type="button" className="w-full py-2 bg-surface-container-low text-[10px] font-bold uppercase tracking-widest text-on-surface-variant rounded-lg border border-border-subtle hover:text-on-surface hover:border-border-subtle transition-colors">
                    Run Security Audit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ ADMIN & USER CONTROL ============ */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h3 className="font-headline-md text-headline-md font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">manage_accounts</span>
              Admin &amp; User Control
            </h3>
            <button type="button" className="px-4 py-2 bg-secondary text-on-secondary text-xs font-bold rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined text-sm">add</span> Create New User
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-border-subtle">
                    <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">User Name</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Role</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Last Login</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  <tr className="hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary/15 flex items-center justify-center text-xs font-bold text-secondary">JD</div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-on-surface">John Doe</span>
                          <span className="text-xs text-on-surface-variant">john.doe@culiat.gov</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="text-xs font-medium px-2 py-1 bg-secondary/15 text-secondary rounded">Superadmin</span></td>
                    <td className="px-6 py-4 text-xs text-on-surface-variant">2 mins ago</td>
                    <td className="px-6 py-4"><div className="flex items-center gap-1.5 text-xs text-success-green font-medium"><span className="w-1.5 h-1.5 bg-success-green rounded-full"></span> Active</div></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" className="p-1.5 text-on-surface-variant hover:text-secondary transition-colors"><span className="material-symbols-outlined text-lg">edit</span></button>
                        <button type="button" className="p-1.5 text-on-surface-variant hover:text-secondary transition-colors"><span className="material-symbols-outlined text-lg">key</span></button>
                        <button type="button" className="p-1.5 text-on-surface-variant hover:text-error transition-colors"><span className="material-symbols-outlined text-lg">block</span></button>
                      </div>
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-xs font-bold text-on-surface-variant">SA</div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-on-surface">Sarah Adams</span>
                          <span className="text-xs text-on-surface-variant">s.adams@culiat.gov</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="text-xs font-medium px-2 py-1 bg-surface-container-low text-on-surface-variant rounded border border-border-subtle">Officer</span></td>
                    <td className="px-6 py-4 text-xs text-on-surface-variant">4 hours ago</td>
                    <td className="px-6 py-4"><div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium"><span className="w-1.5 h-1.5 bg-cc-muted rounded-full"></span> Suspended</div></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" className="p-1.5 text-on-surface-variant hover:text-secondary transition-colors"><span className="material-symbols-outlined text-lg">edit</span></button>
                        <button type="button" className="p-1.5 text-on-surface-variant hover:text-secondary transition-colors"><span className="material-symbols-outlined text-lg">key</span></button>
                        <button type="button" className="p-1.5 text-on-surface-variant hover:text-success-green transition-colors"><span className="material-symbols-outlined text-lg">check_circle</span></button>
                      </div>
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-xs font-bold text-on-surface-variant">MV</div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-on-surface">Mark Valdez</span>
                          <span className="text-xs text-on-surface-variant">m.valdez@culiat.gov</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="text-xs font-medium px-2 py-1 bg-surface-container-low text-on-surface-variant rounded border border-border-subtle">Officer</span></td>
                    <td className="px-6 py-4 text-xs text-on-surface-variant">1 hour ago</td>
                    <td className="px-6 py-4"><div className="flex items-center gap-1.5 text-xs text-success-green font-medium"><span className="w-1.5 h-1.5 bg-success-green rounded-full"></span> Active</div></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" className="p-1.5 text-on-surface-variant hover:text-secondary transition-colors"><span className="material-symbols-outlined text-lg">edit</span></button>
                        <button type="button" className="p-1.5 text-on-surface-variant hover:text-secondary transition-colors"><span className="material-symbols-outlined text-lg">key</span></button>
                        <button type="button" className="p-1.5 text-on-surface-variant hover:text-error transition-colors"><span className="material-symbols-outlined text-lg">block</span></button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ============ RECENT SYSTEM EVENTS ============ */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h3 className="font-headline-md text-headline-md font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">assignment</span>
              Recent System Events
            </h3>
            <button type="button" className="text-xs font-bold text-secondary hover:underline uppercase tracking-widest">View Full Audit Log</button>
          </div>
          <div className="bg-white rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-border-subtle">
                    <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Timestamp</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Category</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Description</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  <tr className="hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-4 text-xs text-on-surface-variant font-medium">2023-10-24 14:22:01</td>
                    <td className="px-6 py-4"><span className="text-[10px] font-bold uppercase text-on-surface-variant">Security</span></td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">Failed login attempt from IP 192.168.1.45</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-error/15 text-error text-[10px] font-bold rounded uppercase">Critical</span></td>
                  </tr>
                  <tr className="hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-4 text-xs text-on-surface-variant font-medium">2023-10-24 14:15:30</td>
                    <td className="px-6 py-4"><span className="text-[10px] font-bold uppercase text-on-surface-variant">Config</span></td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">System backup completed successfully</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-secondary/15 text-secondary text-[10px] font-bold rounded uppercase">Info</span></td>
                  </tr>
                  <tr className="hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-4 text-xs text-on-surface-variant font-medium">2023-10-24 13:50:12</td>
                    <td className="px-6 py-4"><span className="text-[10px] font-bold uppercase text-on-surface-variant">User Action</span></td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">User 'John Doe' updated role permissions for 'Officer'</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-secondary/15 text-secondary text-[10px] font-bold rounded uppercase">Warning</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}




