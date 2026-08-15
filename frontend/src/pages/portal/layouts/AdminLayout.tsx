import PortalLayout from './PortalLayout';
import { adminNav } from './nav';

export default function AdminLayout() {
  return <PortalLayout nav={adminNav} fab fabLabel="QUICK DISPATCH" />;
}
