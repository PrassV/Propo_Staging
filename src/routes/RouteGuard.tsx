import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import LoadingSpinner from '../components/common/LoadingSpinner';

interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireProfile?: boolean;
}

export default function RouteGuard({ 
  children, 
  requireAuth = true,
  requireProfile = false 
}: RouteGuardProps) {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  // Don't show loading if we don't require auth or profile
  if (!requireAuth && !requireProfile) {
    return <>{children}</>;
  }

  // Show loading while checking auth/profile
  if ((requireAuth && authLoading) || (requireProfile && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Not logged in but route requires auth
  if (!user && requireAuth) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Logged in but no profile when required
  if (user && requireProfile && !profile?.first_name && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}