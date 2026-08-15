export default function SuperadminDashboard() {
  return (
    <div className="-m-8 bg-cc-bg text-cc-body font-body min-h-[calc(100vh-64px)] px-10 py-8 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(1100px 500px at 88% -10%, var(--color-cc-glow-blue), transparent 60%), radial-gradient(900px 460px at -8% 2%, var(--color-cc-glow-accent), transparent 55%)',
        }}
      ></div>
      <div className="relative space-y-8">
        {/* ============ SYSTEM INFRASTRUCTURE KPI ============ */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-headline-md text-headline-md font-bold text-cc-heading flex items-center gap-2">
              <span className="material-symbols-outlined text-cc-accent">dns</span>
              System Infrastructure Overview
            </h3>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cc-muted uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-cc-emerald animate-pulse"></span> Real-time Monitoring
            </span>
          </div>
          <div className="grid grid-cols-12 gap-6">
            {/* Server Status */}
            <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-cc-card p-6 rounded-2xl border border-cc-border border-t-2 border-t-cc-emerald shadow-cc-card">
              <div className="flex justify-between items-start mb-5">
                <p className="text-sm font-medium text-cc-muted">Server Status</p>
                <span className="px-2 py-1 bg-cc-emerald/10 text-cc-emerald text-[10px] font-bold rounded uppercase border border-cc-emerald/25">Online</span>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-cc-body">CPU Load</span>
                    <span className="font-semibold text-cc-heading">24%</span>
                  </div>
                  <div className="w-full bg-cc-track h-1.5 rounded-full overflow-hidden"><div className="bg-cc-teal h-full" style={{ width: '24%' }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-cc-body">Memory</span>
                    <span className="font-semibold text-cc-heading">4.2 / 16 GB</span>
                  </div>
                  <div className="w-full bg-cc-track h-1.5 rounded-full overflow-hidden"><div className="bg-cc-teal h-full" style={{ width: '35%' }}></div></div>
                </div>
              </div>
            </div>
            {/* Database Connectivity */}
            <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-cc-card p-6 rounded-2xl border border-cc-border border-t-2 border-t-cc-blue shadow-cc-card">
              <div className="flex justify-between items-start mb-5">
                <p className="text-sm font-medium text-cc-muted">Database Connectivity</p>
                <span className="material-symbols-outlined text-cc-muted">database</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-cc-body">Active Pools</span>
                  <span className="font-semibold text-cc-heading">128</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-cc-body">Query Latency</span>
                  <span className="font-semibold text-cc-emerald">12ms</span>
                </div>
                <div className="mt-4 pt-4 border-t border-cc-border flex items-center gap-2 text-[10px] text-cc-muted font-bold uppercase">
                  <span className="w-2 h-2 bg-cc-emerald rounded-full"></span> Stable Connection
                </div>
              </div>
            </div>
            {/* Network Traffic */}
            <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-cc-card p-6 rounded-2xl border border-cc-border border-t-2 border-t-cc-teal shadow-cc-card">
              <div className="flex justify-between items-start mb-5">
                <p className="text-sm font-medium text-cc-muted">Network Traffic</p>
                <span className="material-symbols-outlined text-cc-muted">show_chart</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-cc-body">Inbound</span>
                  <span className="font-bold text-cc-heading">45.2 Mb/s</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-cc-body">Outbound</span>
                  <span className="font-bold text-cc-heading">12.8 Mb/s</span>
                </div>
                <div className="h-10 flex items-end gap-1 mt-2">
                  <div className="flex-1 bg-cc-teal/20 h-4 rounded-t-sm"></div>
                  <div className="flex-1 bg-cc-teal/40 h-6 rounded-t-sm"></div>
                  <div className="flex-1 bg-cc-teal/60 h-8 rounded-t-sm"></div>
                  <div className="flex-1 bg-cc-teal h-10 rounded-t-sm"></div>
                  <div className="flex-1 bg-cc-teal/80 h-7 rounded-t-sm"></div>
                </div>
              </div>
            </div>
            {/* Security Level */}
            <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-cc-card p-6 rounded-2xl border border-cc-border border-t-2 border-t-cc-accent shadow-cc-card">
              <div className="flex justify-between items-start mb-5">
                <p className="text-sm font-medium text-cc-muted">Security Level</p>
                <span className="material-symbols-outlined text-cc-accent">verified_user</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-cc-body">Threat Level</span>
                  <span className="font-bold text-cc-emerald">NORMAL</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-cc-body">SSL Cert</span>
                  <span className="text-cc-muted">Valid (240d)</span>
                </div>
                <div className="mt-4 pt-4 border-t border-cc-border">
                  <button type="button" className="w-full py-2 bg-cc-hover text-[10px] font-bold uppercase tracking-widest text-cc-muted rounded-lg border border-cc-border hover:text-cc-heading hover:border-cc-border-strong transition-colors">
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
            <h3 className="font-headline-md text-headline-md font-bold text-cc-heading flex items-center gap-2">
              <span className="material-symbols-outlined text-cc-accent">manage_accounts</span>
              Admin &amp; User Control
            </h3>
            <button type="button" className="px-4 py-2 bg-cc-accent text-cc-on-accent text-xs font-bold rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined text-sm">add</span> Create New User
            </button>
          </div>
          <div className="bg-cc-card rounded-2xl border border-cc-border shadow-cc-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-cc-hover border-b border-cc-border">
                    <th className="px-6 py-4 text-[10px] font-bold text-cc-muted uppercase tracking-widest">User Name</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-cc-muted uppercase tracking-widest">Role</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-cc-muted uppercase tracking-widest">Last Login</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-cc-muted uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-cc-muted uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cc-border">
                  <tr className="hover:bg-cc-hover transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-cc-accent/15 flex items-center justify-center text-xs font-bold text-cc-accent">JD</div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-cc-heading">John Doe</span>
                          <span className="text-xs text-cc-muted">john.doe@culiat.gov</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="text-xs font-medium px-2 py-1 bg-cc-blue/15 text-cc-blue rounded">Superadmin</span></td>
                    <td className="px-6 py-4 text-xs text-cc-muted">2 mins ago</td>
                    <td className="px-6 py-4"><div className="flex items-center gap-1.5 text-xs text-cc-emerald font-medium"><span className="w-1.5 h-1.5 bg-cc-emerald rounded-full"></span> Active</div></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" className="p-1.5 text-cc-muted hover:text-cc-accent transition-colors"><span className="material-symbols-outlined text-lg">edit</span></button>
                        <button type="button" className="p-1.5 text-cc-muted hover:text-cc-accent transition-colors"><span className="material-symbols-outlined text-lg">key</span></button>
                        <button type="button" className="p-1.5 text-cc-muted hover:text-cc-red transition-colors"><span className="material-symbols-outlined text-lg">block</span></button>
                      </div>
                    </td>
                  </tr>
                  <tr className="hover:bg-cc-hover transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-cc-hover flex items-center justify-center text-xs font-bold text-cc-body">SA</div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-cc-heading">Sarah Adams</span>
                          <span className="text-xs text-cc-muted">s.adams@culiat.gov</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="text-xs font-medium px-2 py-1 bg-cc-hover text-cc-body rounded border border-cc-border">Officer</span></td>
                    <td className="px-6 py-4 text-xs text-cc-muted">4 hours ago</td>
                    <td className="px-6 py-4"><div className="flex items-center gap-1.5 text-xs text-cc-muted font-medium"><span className="w-1.5 h-1.5 bg-cc-muted rounded-full"></span> Suspended</div></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" className="p-1.5 text-cc-muted hover:text-cc-accent transition-colors"><span className="material-symbols-outlined text-lg">edit</span></button>
                        <button type="button" className="p-1.5 text-cc-muted hover:text-cc-accent transition-colors"><span className="material-symbols-outlined text-lg">key</span></button>
                        <button type="button" className="p-1.5 text-cc-muted hover:text-cc-emerald transition-colors"><span className="material-symbols-outlined text-lg">check_circle</span></button>
                      </div>
                    </td>
                  </tr>
                  <tr className="hover:bg-cc-hover transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-cc-hover flex items-center justify-center text-xs font-bold text-cc-body">MV</div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-cc-heading">Mark Valdez</span>
                          <span className="text-xs text-cc-muted">m.valdez@culiat.gov</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="text-xs font-medium px-2 py-1 bg-cc-hover text-cc-body rounded border border-cc-border">Officer</span></td>
                    <td className="px-6 py-4 text-xs text-cc-muted">1 hour ago</td>
                    <td className="px-6 py-4"><div className="flex items-center gap-1.5 text-xs text-cc-emerald font-medium"><span className="w-1.5 h-1.5 bg-cc-emerald rounded-full"></span> Active</div></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" className="p-1.5 text-cc-muted hover:text-cc-accent transition-colors"><span className="material-symbols-outlined text-lg">edit</span></button>
                        <button type="button" className="p-1.5 text-cc-muted hover:text-cc-accent transition-colors"><span className="material-symbols-outlined text-lg">key</span></button>
                        <button type="button" className="p-1.5 text-cc-muted hover:text-cc-red transition-colors"><span className="material-symbols-outlined text-lg">block</span></button>
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
            <h3 className="font-headline-md text-headline-md font-bold text-cc-heading flex items-center gap-2">
              <span className="material-symbols-outlined text-cc-accent">assignment</span>
              Recent System Events
            </h3>
            <button type="button" className="text-xs font-bold text-cc-accent hover:underline uppercase tracking-widest">View Full Audit Log</button>
          </div>
          <div className="bg-cc-card rounded-2xl border border-cc-border shadow-cc-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-cc-hover border-b border-cc-border">
                    <th className="px-6 py-4 text-[10px] font-bold text-cc-muted uppercase tracking-widest">Timestamp</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-cc-muted uppercase tracking-widest">Category</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-cc-muted uppercase tracking-widest">Description</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-cc-muted uppercase tracking-widest">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cc-border">
                  <tr className="hover:bg-cc-hover transition-colors">
                    <td className="px-6 py-4 text-xs text-cc-muted font-medium">2023-10-24 14:22:01</td>
                    <td className="px-6 py-4"><span className="text-[10px] font-bold uppercase text-cc-muted">Security</span></td>
                    <td className="px-6 py-4 text-sm text-cc-body">Failed login attempt from IP 192.168.1.45</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-cc-red/15 text-cc-red text-[10px] font-bold rounded uppercase">Critical</span></td>
                  </tr>
                  <tr className="hover:bg-cc-hover transition-colors">
                    <td className="px-6 py-4 text-xs text-cc-muted font-medium">2023-10-24 14:15:30</td>
                    <td className="px-6 py-4"><span className="text-[10px] font-bold uppercase text-cc-muted">Config</span></td>
                    <td className="px-6 py-4 text-sm text-cc-body">System backup completed successfully</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-cc-blue/15 text-cc-blue text-[10px] font-bold rounded uppercase">Info</span></td>
                  </tr>
                  <tr className="hover:bg-cc-hover transition-colors">
                    <td className="px-6 py-4 text-xs text-cc-muted font-medium">2023-10-24 13:50:12</td>
                    <td className="px-6 py-4"><span className="text-[10px] font-bold uppercase text-cc-muted">User Action</span></td>
                    <td className="px-6 py-4 text-sm text-cc-body">User 'John Doe' updated role permissions for 'Officer'</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-cc-accent/15 text-cc-accent text-[10px] font-bold rounded uppercase">Warning</span></td>
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
