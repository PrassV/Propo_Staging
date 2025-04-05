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

  // Add detailed logging before the check
  console.log('[RouteGuard] Checking profile completion:', {
    pathname: location.pathname,
    authLoading,
    profileLoading,
    userExists: !!user,
    profileExists: !!profile,
    profileData: JSON.stringify(profile),
    requiresProfile: requireProfile,
  });

  // Check if profile is complete (must have name AND role/user_type set)
  const isProfileComplete = profile && 
                           profile.first_name && 
                           profile.last_name && 
                           (profile.role || profile.user_type);

  console.log('[RouteGuard] isProfileComplete result:', isProfileComplete); // Log the result

  // Logged in but no complete profile when required
  if (user && requireProfile && !isProfileComplete && location.pathname !== '/onboarding') {
    console.log('[RouteGuard] Redirecting to /onboarding because profile is incomplete.'); // Log redirect reason
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}