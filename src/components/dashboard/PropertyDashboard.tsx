import { useProfile } from '../../hooks/useProfile';
import TenantDashboard from './tenant/TenantDashboard';
import OwnerDashboard from './owner/OwnerDashboard';
import LoadingSpinner from '../common/LoadingSpinner';

export default function PropertyDashboard() {
  const { profile, loading } = useProfile();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!profile) {
    return null;
  }

  // Show different dashboard based on user type
  return profile.user_type === 'owner' ? <OwnerDashboard /> : <TenantDashboard />;
}