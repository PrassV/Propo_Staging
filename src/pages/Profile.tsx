import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
// Remove unused useAuth import if user is not needed
// import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import LoadingSpinner from '../components/common/LoadingSpinner';
// Remove UserTypeSwitch import
// import UserTypeSwitch from '../components/onboarding/UserTypeSwitch'; 
import ProfileView from '../components/profile/ProfileView';
import ProfileForm from '../components/profile/ProfileForm';
import api from '../api'; // Import api client
import toast from 'react-hot-toast'; // Import toast
import { ProfileFormData } from '@/types/profile'; // Import form data type

export default function Profile() {
  const navigate = useNavigate();
  // Removed unused user variable
  // const { user } = useAuth();
  const { profile, loading, refetch } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Automatically enter edit mode if role is missing after loading
  useEffect(() => {
    if (!loading && profile && !profile.role) {
      setIsEditing(true);
    }
  }, [loading, profile]);

  // Redirect to dashboard if we're in the process of redirecting
  useEffect(() => {
    if (redirecting) {
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 1500); // Short delay to allow toast to be seen
      
      return () => clearTimeout(timer);
    }
  }, [redirecting, navigate]);

  if (loading) return <LoadingSpinner />;
  if (!profile) return <div className="p-6">Error loading profile data.</div>;

  // Handle profile update API call
  const handleSave = async (formData: Partial<ProfileFormData>) => {
    if (!profile) return;
    
    console.log("Form data received:", formData);
    
    // Create a properly typed payload for the API
    const updatePayload = {
      first_name: formData.firstName || '',
      last_name: formData.lastName || '',
      phone: formData.phone || '',
      // Include address fields
      ...(formData.addressLine1 ? { address_line1: formData.addressLine1 } : {}),
      ...(formData.addressLine2 ? { address_line2: formData.addressLine2 } : {}),
      ...(formData.city ? { city: formData.city } : {}),
      ...(formData.state ? { state: formData.state } : {}),
      ...(formData.pincode ? { pincode: formData.pincode } : {}),
      // Set role if provided
      ...(formData.role ? { role: formData.role } : {})
    };
    
    console.log("Update payload:", updatePayload);

    toast.loading('Updating profile...');
    try {
      // Change from user service to auth service for profile updates
      await api.auth.updateUserProfile(updatePayload);
      toast.dismiss();
      toast.success('Profile updated successfully!');
      setIsEditing(false);
      await refetch();
      
      // Check if role was provided and it's a new profile
      if (formData.role && (!profile.role || profile.role !== formData.role)) {
        toast.success('Profile completed! Redirecting to dashboard...');
        setRedirecting(true);
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.dismiss();
      
      // Refined error message extraction without 'any'
      let message = 'Failed to update profile.';
      if (error && typeof error === 'object') {
        if ('response' in error) {
          const errorResponse = error.response as { data?: { detail?: string } };
          if (errorResponse.data?.detail) {
            message = errorResponse.data.detail;
          } else if (error instanceof Error) {
            message = error.message; // Fallback to generic error message if detail missing
          }
        } else if (error instanceof Error) {
           message = error.message; // Handle errors that aren't API responses
        }
      }
      
      toast.error(message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-black mb-6"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back
      </button>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold mb-8">Profile Settings</h1>

        {/* Removed UserTypeSwitch */}

        <div className="mt-8">
          {isEditing ? (
            <ProfileForm
              // Pass initial data including role
              initialData={{
                id: profile.id,
                firstName: profile.first_name || '', 
                lastName: profile.last_name || '',
                phone: profile.phone || '',
                addressLine1: profile.address_line1 || '', 
                addressLine2: profile.address_line2 || '',
                city: profile.city || '', 
                state: profile.state || '', 
                pincode: profile.pincode || '',
                role: (profile.role === 'owner' || profile.role === 'tenant') ? profile.role : 'owner', 
              }}
              onSave={handleSave} // Use the new handler
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <ProfileView 
              profile={profile}
              onEdit={() => setIsEditing(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}