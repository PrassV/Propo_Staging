import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import { useInvitationData } from '../../hooks/useInvitationData';
import UserTypeSelection from './UserTypeSelection';
import OwnerOnboardingForm from './OwnerOnboardingForm';
import TenantOnboardingForm from './tenant/EnhancedTenantOnboardingForm';
import UserTypeSwitch from './UserTypeSwitch';
import LoadingSpinner from '../common/LoadingSpinner';

const OnboardingFlow = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { invitationData, loading: invitationLoading } = useInvitationData();
  const [showTypeSelection, setShowTypeSelection] = useState(false);

  // Helper function to get user type from either role or user_type
  const getUserType = (profile: any): 'owner' | 'tenant' | null => {
    return (profile?.role || profile?.user_type) as 'owner' | 'tenant' | null;
  };

  // Helper function to check if profile is complete
  const isProfileComplete = (profile: any): boolean => {
    return !!(profile?.first_name && profile?.last_name && getUserType(profile));
  };

  useEffect(() => {
    // If user has a complete profile, redirect to dashboard
    if (isProfileComplete(profile)) {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  if (!user) return null;
  
  if (profileLoading || invitationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // If user has a complete profile, don't render anything as they'll be redirected
  if (isProfileComplete(profile)) {
    return null;
  }

  // If this is an invitation, force tenant type
  if (invitationData) {
    return <TenantOnboardingForm />;
  }

  const userType = getUserType(profile);

  // Show type selection if no user type or explicitly showing selection
  if (showTypeSelection || !userType) {
    return (
      <UserTypeSelection 
        onSelect={(_selectedType) => {
          setShowTypeSelection(false);
          // Force reload profile after type selection
          window.location.reload();
        }} 
      />
    );
  }

  // Show the appropriate onboarding form based on user type
  return (
    <div className="mx-auto max-w-4xl p-6">
      <UserTypeSwitch 
        currentType={userType}
        onSwitch={() => setShowTypeSelection(true)}
      />
      
      {userType === 'owner' ? (
        <OwnerOnboardingForm />
      ) : (
        <TenantOnboardingForm />
      )}
    </div>
  );
}

export default OnboardingFlow;