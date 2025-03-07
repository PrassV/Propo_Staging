import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import { useInvitationData } from '../../hooks/useInvitationData';
import UserTypeSelection from './UserTypeSelection';
import OwnerOnboardingForm from './OwnerOnboardingForm';
import TenantOnboardingForm from './tenant/TenantOnboardingForm';
import UserTypeSwitch from './UserTypeSwitch';
import LoadingSpinner from '../common/LoadingSpinner';

const OnboardingFlow = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { invitationData, loading: invitationLoading } = useInvitationData();
  const [showTypeSelection, setShowTypeSelection] = useState(false);

  useEffect(() => {
    // If user has a complete profile, redirect to dashboard
    if (profile?.first_name && profile?.last_name) {
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
  if (profile?.first_name && profile?.last_name) {
    return null;
  }

  // If this is an invitation, force tenant type
  if (invitationData) {
    return <TenantOnboardingForm />;
  }

  // Show type selection if no user type or explicitly showing selection
  if (showTypeSelection || !profile?.user_type) {
    return (
      <UserTypeSelection 
        onSelect={(type) => {
          setShowTypeSelection(false);
          // Force reload profile after type selection
          window.location.reload();
        }} 
      />
    );
  }

  // Show the appropriate form based on user type
  return (
    <div className="min-h-screen bg-gray-50">
      <UserTypeSwitch 
        currentType={profile.user_type} 
        onSwitch={() => setShowTypeSelection(true)} 
      />
      
      {profile.user_type === 'owner' ? (
        <OwnerOnboardingForm />
      ) : (
        <TenantOnboardingForm />
      )}
    </div>
  );
};

export default OnboardingFlow;