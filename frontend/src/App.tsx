import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import AuthCallback from './pages/AuthCallback';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import About from './pages/About';
import Services from './pages/Services';
import Contact from './pages/Contact';
import Officials from './pages/Officials';
import ElderGuide from './pages/ElderGuide';
import TrackCases from './pages/TrackCases';
import FAQ from './pages/FAQ';
import Profile from './pages/portal/Profile';
import RoleGuard from './components/RoleGuard';
import AdminLayout from './pages/portal/layouts/AdminLayout';
import SuperadminLayout from './pages/portal/layouts/SuperadminLayout';
import UserLayout from './pages/portal/layouts/UserLayout';
import OfficerLayout from './pages/portal/layouts/OfficerLayout';
import AdminDashboard from './pages/portal/admin/AdminDashboard';
import AdminIncidentReporting from './pages/portal/admin/AdminIncidentReporting';
import AdminAiDispatchTerminal from './pages/portal/admin/AdminAiDispatchTerminal';
import AdminContactsInbox from './pages/portal/admin/AdminContactsInbox';
import AdminTanodRoster from './pages/portal/admin/AdminTanodRoster';
import AdminBlotterTracking from './pages/portal/admin/AdminBlotterTracking';
import AdminEvidenceVault from './pages/portal/admin/AdminEvidenceVault';
import AdminStatusNotifications from './pages/portal/admin/AdminStatusNotifications';
import AdminCaseMonitoring from './pages/portal/admin/AdminCaseMonitoring';
import AdminReportsAnalytics from './pages/portal/admin/AdminReportsAnalytics';
import AdminOfficialsManagement from './pages/portal/admin/AdminOfficialsManagement';
import AdminAuditLogs from './pages/portal/admin/AdminAuditLogs';
import AdminAccountSettings from './pages/portal/admin/AdminAccountSettings';
import SuperadminDashboard from './pages/portal/superadmin/SuperadminDashboard';
import SuperadminAdminManagement from './pages/portal/superadmin/SuperadminAdminManagement';
import SuperadminUserControl from './pages/portal/superadmin/SuperadminUserControl';
import SuperadminRolePermissions from './pages/portal/superadmin/SuperadminRolePermissions';
import SuperadminDatabaseManagement from './pages/portal/superadmin/SuperadminDatabaseManagement';
import SuperadminAiConfig from './pages/portal/superadmin/SuperadminAiConfig';
import SuperadminAiDispatch from './pages/portal/superadmin/SuperadminAiDispatch';
import SuperadminAiRuleManagement from './pages/portal/superadmin/SuperadminAiRuleManagement';
import SuperadminAuditLogs from './pages/portal/superadmin/SuperadminAuditLogs';
import SuperadminSecurityCenter from './pages/portal/superadmin/SuperadminSecurityCenter';
import SuperadminReportRegistry from './pages/portal/superadmin/SuperadminReportRegistry';
import UserDashboard from './pages/portal/user/UserDashboard';
import ReportIncident from './pages/portal/user/ReportIncident';
import MyIncidentReports from './pages/portal/user/MyIncidentReports';
import EmergencySos from './pages/portal/user/EmergencySos';
import CaseChat from './pages/portal/user/CaseChat';
import EvidenceVault from './pages/portal/user/EvidenceVault';
import Advisories from './pages/portal/user/Advisories';
import AccountSettings from './pages/portal/user/AccountSettings';
import OfficerDashboard from './pages/portal/officer/OfficerDashboard';
import OfficerMyIncidents from './pages/portal/officer/OfficerMyIncidents';
import OfficerTeam from './pages/portal/officer/OfficerTeam';
import OfficerAlerts from './pages/portal/officer/OfficerAlerts';

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/about", element: <About /> },
  { path: "/services", element: <Services /> },
  { path: "/contact", element: <Contact /> },
  { path: "/officials", element: <Officials /> },
  { path: "/elder-guide", element: <ElderGuide /> },
  { path: "/track-cases", element: <TrackCases /> },
  { path: "/faq", element: <FAQ /> },
  { path: "/signin", element: <SignIn /> },
  { path: "/signup", element: <SignUp /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "/auth/callback", element: <AuthCallback /> },
  { path: "/profile", element: <Profile /> },
  {
    path: "/admin",
    element: (
      <RoleGuard allowed={['admin']}>
        <AdminLayout />
      </RoleGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: "dashboard", element: <AdminDashboard /> },
      { path: "incident-reporting", element: <AdminIncidentReporting /> },
      { path: "ai-dispatch-terminal", element: <AdminAiDispatchTerminal /> },
      { path: "contacts-inbox", element: <AdminContactsInbox /> },
      { path: "tanod-roster", element: <AdminTanodRoster /> },
      { path: "blotter-tracking", element: <AdminBlotterTracking /> },
      { path: "evidence-vault", element: <AdminEvidenceVault /> },
      { path: "status-notifications", element: <AdminStatusNotifications /> },
      { path: "case-monitoring", element: <AdminCaseMonitoring /> },
      { path: "reports", element: <AdminReportsAnalytics /> },
      { path: "officials", element: <AdminOfficialsManagement /> },
      { path: "audit-logs", element: <AdminAuditLogs /> },
      { path: "account-settings", element: <AdminAccountSettings /> },
    ],
  },
  {
    path: "/superadmin",
    element: (
      <RoleGuard allowed={['superadmin']}>
        <SuperadminLayout />
      </RoleGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/superadmin/dashboard" replace /> },
      { path: "dashboard", element: <SuperadminDashboard /> },
      { path: "admin-management", element: <SuperadminAdminManagement /> },
      { path: "user-control", element: <SuperadminUserControl /> },
      { path: "role-permissions", element: <SuperadminRolePermissions /> },
      { path: "database", element: <SuperadminDatabaseManagement /> },
      { path: "ai-config", element: <SuperadminAiConfig /> },
      { path: "ai-dispatch", element: <SuperadminAiDispatch /> },
      { path: "ai-rule-management", element: <SuperadminAiRuleManagement /> },
      { path: "report-registry", element: <SuperadminReportRegistry /> },
      { path: "audit-logs", element: <SuperadminAuditLogs /> },
      { path: "security-center", element: <SuperadminSecurityCenter /> },
    ],
  },
  {
    path: "/officer",
    element: (
      <RoleGuard allowed={['officer']}>
        <OfficerLayout />
      </RoleGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/officer/dashboard" replace /> },
      { path: "dashboard", element: <OfficerDashboard /> },
      { path: "my-incidents", element: <OfficerMyIncidents /> },
      { path: "team", element: <OfficerTeam /> },
      { path: "alerts", element: <OfficerAlerts /> },
    ],
  },
  {
    path: "/user",
    element: (
      <RoleGuard allowed={['user']}>
        <UserLayout />
      </RoleGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/user/dashboard" replace /> },
      { path: "dashboard", element: <UserDashboard /> },
      { path: "report-incident", element: <ReportIncident /> },
      { path: "my-incident-reports", element: <MyIncidentReports /> },
      { path: "emergency-sos", element: <EmergencySos /> },
      { path: "case-chat", element: <CaseChat /> },
      { path: "evidence-vault", element: <EvidenceVault /> },
      { path: "advisories", element: <Advisories /> },
      { path: "account-settings", element: <AccountSettings /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
