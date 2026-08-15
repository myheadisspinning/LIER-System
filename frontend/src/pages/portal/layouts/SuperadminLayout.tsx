import PortalLayout from './PortalLayout';
import { superadminNav } from './nav';

export default function SuperadminLayout() {
  return <PortalLayout nav={superadminNav} />;
}
