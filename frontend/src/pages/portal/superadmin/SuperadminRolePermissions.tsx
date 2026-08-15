export default function SuperadminRolePermissions() {
  return (
    <div className="max-w-container-max mx-auto space-y-lg">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-lg">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Role &amp; Permission Management</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Manage user roles, access permissions, and security policies</p>
        </div>
        <div className="flex items-center gap-sm">
          <button type="button" className="font-label-md text-label-md text-primary bg-surface border border-outline-variant hover:bg-surface-container px-md py-sm rounded-lg transition-colors flex items-center gap-xs shadow-sm">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Import
          </button>
          <button type="button" className="font-label-md text-label-md text-primary bg-surface border border-outline-variant hover:bg-surface-container px-md py-sm rounded-lg transition-colors flex items-center gap-xs shadow-sm">
            <span className="material-symbols-outlined text-[18px]">upload</span>
            Export
          </button>
          <button type="button" className="font-label-md text-label-md text-on-secondary bg-secondary hover:bg-secondary-container px-md py-sm rounded-lg transition-colors flex items-center gap-xs shadow-sm shadow-secondary/20">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create Role
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col justify-between shadow-[0_4px_12px_rgba(15,61,117,0.05)] relative overflow-hidden group hover:border-secondary transition-colors">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-container/5 rounded-full blur-xl group-hover:bg-primary-container/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-sm relative z-10">
            <p className="font-label-md text-label-md text-on-surface-variant">Total Roles</p>
            <span className="material-symbols-outlined text-primary p-xs bg-primary-container/10 rounded-md">badge</span>
          </div>
          <h3 className="font-headline-lg text-headline-lg text-on-surface relative z-10">3</h3>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col justify-between shadow-[0_4px_12px_rgba(15,61,117,0.05)] relative overflow-hidden group hover:border-secondary transition-colors">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-tertiary-container/5 rounded-full blur-xl group-hover:bg-tertiary-container/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-sm relative z-10">
            <p className="font-label-md text-label-md text-on-surface-variant">Active Users</p>
            <span className="material-symbols-outlined text-tertiary-container p-xs bg-tertiary-container/10 rounded-md">group</span>
          </div>
          <h3 className="font-headline-lg text-headline-lg text-on-surface relative z-10">35</h3>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col justify-between shadow-[0_4px_12px_rgba(15,61,117,0.05)] relative overflow-hidden group hover:border-secondary transition-colors">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary-container/5 rounded-full blur-xl group-hover:bg-secondary-container/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-sm relative z-10">
            <p className="font-label-md text-label-md text-on-surface-variant">Protected Modules</p>
            <span className="material-symbols-outlined text-secondary-container p-xs bg-secondary-container/10 rounded-md">security</span>
          </div>
          <h3 className="font-headline-lg text-headline-lg text-on-surface relative z-10">18</h3>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col justify-between shadow-[0_4px_12px_rgba(15,61,117,0.05)] relative overflow-hidden group hover:border-secondary transition-colors">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-error-container/30 rounded-full blur-xl group-hover:bg-error-container/50 transition-colors"></div>
          <div className="flex justify-between items-start mb-sm relative z-10">
            <p className="font-label-md text-label-md text-on-surface-variant">Permission Changes</p>
            <span className="material-symbols-outlined text-error p-xs bg-error-container/50 rounded-md">update</span>
          </div>
          <div className="flex items-end gap-sm relative z-10">
            <h3 className="font-headline-lg text-headline-lg text-on-surface">12</h3>
            <span className="font-label-sm text-label-sm text-on-surface-variant mb-1">Today</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
        <div className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_4px_12px_rgba(15,61,117,0.05)] flex flex-col h-[800px]">
          <div className="p-md border-b border-outline-variant flex flex-col gap-sm">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
              <input className="w-full pl-xl pr-sm py-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all" placeholder="Search roles..." type="text" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-sm space-y-sm">
            <div className="p-md rounded-lg border border-secondary bg-surface-container-low relative overflow-hidden cursor-pointer group">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary rounded-l-lg"></div>
              <div className="flex justify-between items-start mb-sm">
                <h4 className="font-headline-sm text-headline-sm text-on-surface">Superadmin</h4>
                <button type="button" className="text-on-surface-variant hover:text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-[20px]">more_vert</span>
                </button>
              </div>
              <div className="flex items-center gap-xs mb-md">
                <span className="bg-error-container/50 text-on-error-container font-label-sm text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">System Owner</span>
              </div>
              <div className="flex justify-between items-center text-on-surface-variant font-label-sm text-label-sm">
                <div className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[16px]">person</span>
                  1 User
                </div>
                <span className="text-secondary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-xs">
                  Edit <span className="material-symbols-outlined text-[14px]">edit</span>
                </span>
              </div>
            </div>
            <div className="p-md rounded-lg border border-transparent hover:border-outline-variant hover:bg-surface-container-low transition-all cursor-pointer group">
              <div className="flex justify-between items-start mb-sm">
                <h4 className="font-headline-sm text-headline-sm text-on-surface">Admin</h4>
                <button type="button" className="text-on-surface-variant hover:text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-[20px]">more_vert</span>
                </button>
              </div>
              <div className="flex items-center gap-xs mb-md">
                <span className="bg-primary-container/10 text-primary font-label-sm text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Barangay Personnel</span>
              </div>
              <div className="flex justify-between items-center text-on-surface-variant font-label-sm text-label-sm">
                <div className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[16px]">group</span>
                  8 Users
                </div>
              </div>
            </div>
            <div className="p-md rounded-lg border border-transparent hover:border-outline-variant hover:bg-surface-container-low transition-all cursor-pointer group">
              <div className="flex justify-between items-start mb-sm">
                <h4 className="font-headline-sm text-headline-sm text-on-surface">Resident / User</h4>
                <button type="button" className="text-on-surface-variant hover:text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-[20px]">more_vert</span>
                </button>
              </div>
              <div className="flex items-center gap-xs mb-md">
                <span className="bg-tertiary-container/10 text-tertiary font-label-sm text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Community Member</span>
              </div>
              <div className="flex justify-between items-center text-on-surface-variant font-label-sm text-label-sm">
                <div className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[16px]">groups</span>
                  1245 Users
                </div>
              </div>
            </div>
            <button type="button" className="w-full py-md mt-sm border border-dashed border-outline-variant rounded-lg text-on-surface-variant hover:text-secondary hover:border-secondary hover:bg-surface-container-low transition-all flex items-center justify-center gap-xs font-label-md text-label-md">
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Create Custom Role
            </button>
          </div>
        </div>
        <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_4px_12px_rgba(15,61,117,0.05)] flex flex-col h-[800px] overflow-hidden">
          <div className="px-lg py-md border-b border-outline-variant flex justify-between items-center bg-surface-bright">
            <div className="flex items-center gap-md">
              <div className="w-2 h-8 bg-secondary rounded-full"></div>
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface">Superadmin</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">System Owner • Full Access</p>
              </div>
            </div>
            <div className="flex gap-sm">
              <button type="button" className="p-sm text-on-surface-variant hover:text-secondary hover:bg-surface-container-high rounded-lg transition-colors tooltip-trigger" title="Duplicate Role">
                <span className="material-symbols-outlined">content_copy</span>
              </button>
              <button type="button" disabled className="p-sm text-on-surface-variant hover:text-error hover:bg-error-container/10 rounded-lg transition-colors tooltip-trigger" title="Delete Role">
                <span className="material-symbols-outlined opacity-50 cursor-not-allowed">delete</span>
              </button>
            </div>
          </div>
          <div className="px-lg border-b border-outline-variant flex gap-lg bg-surface-bright">
            <button type="button" className="py-sm border-b-2 border-secondary font-label-md text-label-md text-secondary">Permissions</button>
            <button type="button" className="py-sm border-b-2 border-transparent hover:border-outline-variant font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors">Assigned Users (1)</button>
            <button type="button" className="py-sm border-b-2 border-transparent hover:border-outline-variant font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors">Audit Logs</button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-lg bg-surface-bright">
            <div className="mb-lg flex justify-between items-end">
              <div>
                <h4 className="font-headline-sm text-headline-sm text-on-surface mb-xs">Enterprise Permission Matrix</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Toggle granular access controls for core modules.</p>
              </div>
              <button type="button" className="font-label-sm text-label-sm text-secondary hover:underline flex items-center gap-xs">
                Select All <span className="material-symbols-outlined text-[16px]">done_all</span>
              </button>
            </div>
            <div className="border border-outline-variant rounded-xl overflow-hidden mb-xl bg-surface-container-lowest">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="py-sm px-md font-label-md text-label-md text-primary w-1/3">Module</th>
                    <th className="py-sm px-xs text-center font-label-sm text-label-sm text-on-surface-variant">View</th>
                    <th className="py-sm px-xs text-center font-label-sm text-label-sm text-on-surface-variant">Create</th>
                    <th className="py-sm px-xs text-center font-label-sm text-label-sm text-on-surface-variant">Edit</th>
                    <th className="py-sm px-xs text-center font-label-sm text-label-sm text-on-surface-variant">Delete</th>
                    <th className="py-sm px-xs text-center font-label-sm text-label-sm text-on-surface-variant">Approve</th>
                    <th className="py-sm px-xs text-center font-label-sm text-label-sm text-on-surface-variant">Export</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/50">
                  <tr className="hover:bg-surface-container-lowest transition-colors h-[48px]">
                    <td className="py-xs px-md font-body-sm text-body-sm text-on-surface font-medium flex items-center gap-sm">
                      <span className="material-symbols-outlined text-[18px] text-outline">dashboard</span>
                      Dashboard
                    </td>
                    <td className="text-center"><input defaultChecked className="rounded text-secondary focus:ring-secondary border-outline-variant" type="checkbox" /></td>
                    <td className="text-center"><input disabled className="rounded text-outline-variant focus:ring-secondary border-outline-variant/30 cursor-not-allowed" type="checkbox" /></td>
                    <td className="text-center"><input defaultChecked className="rounded text-secondary focus:ring-secondary border-outline-variant" type="checkbox" /></td>
                    <td className="text-center"><input disabled className="rounded text-outline-variant focus:ring-secondary border-outline-variant/30 cursor-not-allowed" type="checkbox" /></td>
                    <td className="text-center"><input disabled className="rounded text-outline-variant focus:ring-secondary border-outline-variant/30 cursor-not-allowed" type="checkbox" /></td>
                    <td className="text-center"><input defaultChecked className="rounded text-secondary focus:ring-secondary border-outline-variant" type="checkbox" /></td>
                  </tr>
                  <tr className="hover:bg-surface-container-lowest transition-colors h-[48px]">
                    <td className="py-xs px-md font-body-sm text-body-sm text-on-surface font-medium flex items-center gap-sm">
                      <span className="material-symbols-outlined text-[18px] text-outline">security</span>
                      Incident Reports
                    </td>
                    <td className="text-center"><input defaultChecked className="rounded text-secondary focus:ring-secondary border-outline-variant" type="checkbox" /></td>
                    <td className="text-center"><input defaultChecked className="rounded text-secondary focus:ring-secondary border-outline-variant" type="checkbox" /></td>
                    <td className="text-center"><input defaultChecked className="rounded text-secondary focus:ring-secondary border-outline-variant" type="checkbox" /></td>
                    <td className="text-center"><input defaultChecked className="rounded text-error focus:ring-error border-outline-variant" type="checkbox" placeholder="on" value="" /></td>
                    <td className="text-center"><input defaultChecked className="rounded text-tertiary focus:ring-tertiary border-outline-variant" type="checkbox" /></td>
                    <td className="text-center"><input defaultChecked className="rounded text-secondary focus:ring-secondary border-outline-variant" type="checkbox" /></td>
                  </tr>
                  <tr className="hover:bg-surface-container-lowest transition-colors h-[48px]">
                    <td className="py-xs px-md font-body-sm text-body-sm text-on-surface font-medium flex items-center gap-sm">
                      <span className="material-symbols-outlined text-[18px] text-outline">track_changes</span>
                      Case Tracking
                    </td>
                    <td className="text-center"><input defaultChecked className="rounded text-secondary focus:ring-secondary border-outline-variant" type="checkbox" /></td>
                    <td className="text-center"><input defaultChecked className="rounded text-secondary focus:ring-secondary border-outline-variant" type="checkbox" /></td>
                    <td className="text-center"><input defaultChecked className="rounded text-secondary focus:ring-secondary border-outline-variant" type="checkbox" /></td>
                    <td className="text-center"><input defaultChecked className="rounded text-error focus:ring-error border-outline-variant" type="checkbox" /></td>
                    <td className="text-center"><input defaultChecked className="rounded text-tertiary focus:ring-tertiary border-outline-variant" type="checkbox" /></td>
                    <td className="text-center"><input defaultChecked className="rounded text-secondary focus:ring-secondary border-outline-variant" type="checkbox" /></td>
                  </tr>
                  <tr className="hover:bg-surface-container-lowest transition-colors h-[48px]">
                    <td className="py-xs px-md font-body-sm text-body-sm text-on-surface font-medium flex items-center gap-sm">
                      <span className="material-symbols-outlined text-[18px] text-outline">folder_special</span>
                      Evidence Locker
                    </td>
                    <td className="text-center"><input defaultChecked className="rounded text-secondary focus:ring-secondary border-outline-variant" type="checkbox" /></td>
                    <td className="text-center"><input defaultChecked className="rounded text-secondary focus:ring-secondary border-outline-variant" type="checkbox" /></td>
                    <td className="text-center"><input defaultChecked className="rounded text-secondary focus:ring-secondary border-outline-variant" type="checkbox" /></td>
                    <td className="text-center"><input defaultChecked className="rounded text-error focus:ring-error border-outline-variant" type="checkbox" /></td>
                    <td className="text-center"><input defaultChecked className="rounded text-tertiary focus:ring-tertiary border-outline-variant" type="checkbox" /></td>
                    <td className="text-center"><input defaultChecked className="rounded text-secondary focus:ring-secondary border-outline-variant" type="checkbox" /></td>
                  </tr>
                  <tr className="hover:bg-surface-container-lowest transition-colors h-[48px]">
                    <td className="py-xs px-md font-body-sm text-body-sm text-on-surface font-medium flex items-center gap-sm">
                      <span className="material-symbols-outlined text-[18px] text-outline">local_shipping</span>
                      Dispatch
                    </td>
                    <td className="text-center"><input defaultChecked className="rounded text-secondary focus:ring-secondary border-outline-variant" type="checkbox" /></td>
                    <td className="text-center"><input defaultChecked className="rounded text-secondary focus:ring-secondary border-outline-variant" type="checkbox" /></td>
                    <td className="text-center"><input defaultChecked className="rounded text-secondary focus:ring-secondary border-outline-variant" type="checkbox" /></td>
                    <td className="text-center"><input disabled className="rounded text-outline-variant focus:ring-secondary border-outline-variant/30 cursor-not-allowed" type="checkbox" /></td>
                    <td className="text-center"><input defaultChecked className="rounded text-tertiary focus:ring-tertiary border-outline-variant" type="checkbox" /></td>
                    <td className="text-center"><input disabled className="rounded text-outline-variant focus:ring-secondary border-outline-variant/30 cursor-not-allowed" type="checkbox" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <h4 className="font-headline-sm text-headline-sm text-on-surface mb-md mt-xl">Advanced Configuration</h4>
            <div className="space-y-sm">
              <div className="border border-outline-variant rounded-xl bg-surface-container-lowest overflow-hidden">
                <button type="button" className="w-full flex justify-between items-center p-md hover:bg-surface-container-low transition-colors text-left">
                  <div className="flex items-center gap-md">
                    <div className="w-8 h-8 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
                    </div>
                    <div>
                      <h5 className="font-label-md text-label-md text-on-surface">User &amp; Identity Management</h5>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Control over user provisioning, 2FA, and sessions.</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant">expand_more</span>
                </button>
              </div>
              <div className="border border-outline-variant rounded-xl bg-surface-container-lowest overflow-hidden">
                <button type="button" className="w-full flex justify-between items-center p-md bg-surface-container-low transition-colors text-left border-b border-outline-variant">
                  <div className="flex items-center gap-md">
                    <div className="w-8 h-8 rounded-lg bg-secondary-container/10 text-secondary-container flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                    </div>
                    <div>
                      <h5 className="font-label-md text-label-md text-on-surface">AI &amp; Intelligence Configuration</h5>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Gemini API settings, prompt management, and automated analysis.</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant rotate-180 transition-transform">expand_more</span>
                </button>
                <div className="p-md bg-surface-container-lowest grid grid-cols-1 md:grid-cols-2 gap-md">
                  <label className="flex items-start gap-sm p-sm rounded-lg hover:bg-surface-container-low cursor-pointer transition-colors border border-transparent hover:border-outline-variant">
                    <input defaultChecked className="mt-1 rounded text-secondary focus:ring-secondary border-outline-variant" type="checkbox" />
                    <div>
                      <span className="font-label-md text-label-md text-on-surface block">Modify AI Prompts</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">Allow editing of base system prompts for incident analysis.</span>
                    </div>
                  </label>
                  <label className="flex items-start gap-sm p-sm rounded-lg hover:bg-surface-container-low cursor-pointer transition-colors border border-transparent hover:border-outline-variant">
                    <input defaultChecked className="mt-1 rounded text-secondary focus:ring-secondary border-outline-variant" type="checkbox" />
                    <div>
                      <span className="font-label-md text-label-md text-on-surface block">Manage API Keys</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">View and rotate external intelligence service keys.</span>
                    </div>
                  </label>
                  <label className="flex items-start gap-sm p-sm rounded-lg hover:bg-surface-container-low cursor-pointer transition-colors border border-transparent hover:border-outline-variant">
                    <input defaultChecked className="mt-1 rounded text-secondary focus:ring-secondary border-outline-variant" type="checkbox" />
                    <div>
                      <span className="font-label-md text-label-md text-on-surface block">Approve Automated Actions</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">Bypass human-in-the-loop requirements for low-severity alerts.</span>
                    </div>
                  </label>
                </div>
              </div>
              <div className="border border-outline-variant rounded-xl bg-surface-container-lowest overflow-hidden">
                <button type="button" className="w-full flex justify-between items-center p-md hover:bg-surface-container-low transition-colors text-left">
                  <div className="flex items-center gap-md">
                    <div className="w-8 h-8 rounded-lg bg-error-container/20 text-error flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                    </div>
                    <div>
                      <h5 className="font-label-md text-label-md text-on-surface">Core System Administration</h5>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Database access, system logs, and global parameters.</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant">expand_more</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
