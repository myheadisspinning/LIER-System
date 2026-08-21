export interface NavChild {
  label: string;
  to: string;
}

export interface NavItem {
  label: string;
  subLabel?: string;
  description?: string;
  icon?: string;
  to?: string;
  badge?: string;
  unreadKey?: 'admin' | 'user';
  section?: string;
  children?: NavChild[];
}

export interface RoleNav {
  brand: string;
  brandSub: string;
  fallbackTitle: string;
  searchPlaceholder: string;
  items: NavItem[];
}

export const adminNav: RoleNav = {
  brand: 'Culiat',
  brandSub: 'Safety Command',
  fallbackTitle: 'Admin Command Center',
  searchPlaceholder: 'Search incidents, files, officials...',
  items: [
    {
      label: 'Command Dashboard',
      subLabel: 'Central operational overview and alerts',
      icon: 'dashboard',
      to: '/admin/dashboard',
    },
    {
      label: 'Incident Reporting',
      subLabel: 'Review submitted incident reports',
      icon: 'emergency',
      to: '/admin/incident-reporting',
      section: 'Core Operations',
    },
    {
      label: 'Incident Archive',
      subLabel: 'Browse resolved and rejected reports',
      icon: 'archive',
      to: '/admin/incident-archive',
      section: 'Core Operations',
    },
    {
      label: 'Dispatch Terminal',
      subLabel: 'Accept or override AI dispatch',
      icon: 'bolt',
      to: '/admin/ai-dispatch-terminal',
    },
    {
      label: 'Contacts & Inbox',
      subLabel: 'Official communication and inquiries',
      icon: 'chat',
      to: '/admin/contacts-inbox',
      unreadKey: 'admin',
    },
    {
      label: 'Tanod Responder Roster',
      subLabel: 'Manage tanod and responder teams',
      icon: 'shield_person',
      to: '/admin/tanod-roster',
    },
    {
      label: 'Blotter & Case Tracking',
      subLabel: 'Create and manage cases',
      icon: 'assignment_turned_in',
      to: '/admin/blotter-tracking',
      section: 'Case Management',
    },
    {
      label: 'Evidence Vault',
      subLabel: 'Manage evidence records',
      icon: 'inventory_2',
      to: '/admin/evidence-vault',
    },
    {
      label: 'Status Notifications',
      subLabel: 'Publish announcements and alerts',
      icon: 'notifications_active',
      to: '/admin/status-notifications',
    },
    {
      label: 'Case Monitoring',
      subLabel: 'Real-time case progress tracking',
      icon: 'monitoring',
      to: '/admin/case-monitoring',
      section: 'Intelligence',
    },
    {
      label: 'Reports & Analytics',
      subLabel: 'Generate reports and view analytics',
      icon: 'bar_chart',
      to: '/admin/reports',
    },
    {
      label: 'Officials MGMT',
      subLabel: 'Manage barangay officials displayed',
      icon: 'badge',
      to: '/admin/officials',
      section: 'Administration',
    },
    {
      label: 'Community Gallery',
      subLabel: 'Manage homepage carousel images',
      icon: 'photo_library',
      to: '/admin/community-gallery',
    },
    {
      label: 'Audit Logs',
      subLabel: 'System activity and security logs',
      icon: 'security',
      to: '/admin/audit-logs',
    },
    {
      label: 'Account Settings',
      subLabel: 'Manage user accounts (except Super Admin)',
      icon: 'manage_accounts',
      to: '/admin/account-settings',
    },
  ],
};

export const superadminNav: RoleNav = {
  brand: 'Culiat',
  brandSub: 'Safety Command',
  fallbackTitle: 'Superadmin Command Center',
  searchPlaceholder: 'Search users, databases, or security events...',
  items: [
    {
      label: 'Dashboard',
      subLabel: 'Full access to the entire system',
      icon: 'dashboard',
      to: '/superadmin/dashboard',
    },
    {
      label: 'Admin Management',
      icon: 'admin_panel_settings',
      to: '/superadmin/admin-management',
      section: 'User Management',
    },
    {
      label: 'User Control',
      subLabel: 'Manage all users',
      icon: 'admin_panel_settings',
      to: '/superadmin/user-control',
    },
    {
      label: 'Role Permissions',
      subLabel: 'Assign roles and permissions',
      icon: 'manage_accounts',
      to: '/superadmin/role-permissions',
    },
    {
      label: 'Database Management',
      subLabel: 'Backup and restore the database',
      icon: 'database',
      to: '/superadmin/database',
      section: 'System Control',
    },
    {
      label: 'Report Registry',
      subLabel: 'All incident reports & reporter attribution',
      icon: 'list_alt',
      to: '/superadmin/report-registry',
      section: 'Reports & Registry',
    },
    {
      label: 'AI Configuration',
      subLabel: 'Manage AI settings',
      icon: 'auto_transmission',
      to: '/superadmin/ai-config',
      children: [
        { label: 'AI Configuration', to: '/superadmin/ai-config' },
        { label: 'AI Dispatch', to: '/superadmin/ai-dispatch' },
        { label: 'AI Rules Management', to: '/superadmin/ai-rule-management' },
      ],
    },
    {
      label: 'Audit Logs',
      subLabel: 'View audit logs',
      icon: 'assignment',
      to: '/superadmin/audit-logs',
      section: 'Security & Logs',
    },
    {
      label: 'Security Center',
      subLabel: 'Manage authentication and security',
      icon: 'security',
      to: '/superadmin/security-center',
    },
  ],
};

export const officerNav: RoleNav = {
  brand: 'Culiat',
  brandSub: 'Response Team',
  fallbackTitle: 'Officer Portal',
  searchPlaceholder: 'Search incidents, dispatch tasks...',
  items: [
    {
      label: 'Dashboard',
      subLabel: 'Overview',
      description: 'Your assigned incidents, unit status, and today\'s activity.',
      icon: 'dashboard',
      to: '/officer/dashboard',
      section: 'Main Menu',
    },
    {
      label: 'Assigned Incidents',
      subLabel: 'My Tasks',
      description: 'Acknowledge, update, and resolve incidents assigned to your unit.',
      icon: 'assignment_turned_in',
      to: '/officer/my-incidents',
    },
    {
      label: 'Unit & Team',
      subLabel: 'Roster',
      description: 'View your dispatch unit and fellow responders.',
      icon: 'shield_person',
      to: '/officer/team',
      section: 'Response',
    },
    {
      label: 'Community Alerts',
      subLabel: 'Advisories',
      description: 'Official alerts and announcements issued by Barangay Leadership.',
      icon: 'notifications_active',
      to: '/officer/alerts',
    },
  ],
};

export const userNav: RoleNav = {
  brand: 'Culiat',
  brandSub: 'Incident Command',
  fallbackTitle: 'Resident Portal',
  searchPlaceholder: 'Search Command Center...',
  items: [
    {
      label: 'Dashboard',
      subLabel: 'Overview',
      description: 'Personal overview of your reports, alerts, and community updates.',
      icon: 'dashboard',
      to: '/user/dashboard',
      section: 'Main Menu',
    },
    {
      label: 'Report an Incident',
      subLabel: 'New Report',
      description: 'Submit a new incident report with details, location, and media evidence.',
      icon: 'campaign',
      to: '/user/report-incident',
    },
    {
      label: 'My Incident Reports',
      subLabel: 'Track Cases',
      description: 'Track real-time status updates, desk officer assignments, and resolution notes for your filed cases.',
      icon: 'assignment',
      to: '/user/my-incident-reports',
      section: 'Reports',
    },
    {
      label: 'Emergency SOS & Hotlines',
      subLabel: 'SOS & Hotlines',
      description: 'Trigger a priority distress call or instantly reach Barangay Culiat emergency responders.',
      icon: 'emergency',
      to: '/user/emergency-sos',
    },
    {
      label: 'Case Chat & Messages',
      subLabel: 'Messages',
      description: 'Securely message desk officers and review official case conversations.',
      icon: 'chat',
      to: '/user/case-chat',
      unreadKey: 'user',
      section: 'My Portal',
    },
    {
      label: 'Evidence Vault',
      subLabel: 'Digital Evidence',
      description: 'Securely store, hash, and organize CCTV snippets and media files before linking them to incident reports.',
      icon: 'inventory_2',
      to: '/user/evidence-vault',
    },
    {
      label: 'Community Alerts',
      subLabel: 'Public Advisories',
      description: 'Official safety warnings, weather alerts, road closures, and community notices issued by Barangay Culiat Leadership.',
      icon: 'notifications_active',
      to: '/user/advisories',
    },
    {
      label: 'Account & Profile Settings',
      subLabel: 'Profile',
      description: 'Manage residential details, emergency contacts, notification channels, and security credentials.',
      icon: 'manage_accounts',
      to: '/user/account-settings',
      section: 'Account',
    },
  ],
};
