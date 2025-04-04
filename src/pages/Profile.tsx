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

  // Automatically enter edit mode if role is missing after loading
  useEffect(() => {
    if (!loading && profile && !profile.role) {
      setIsEditing(true);
    }
  }, [loading, profile]);

  if (loading) return <LoadingSpinner />;
  if (!profile) return <div className="p-6">Error loading profile data.</div>;

  // Handle profile update API call
  const handleSave = async (formData: Partial<ProfileFormData>) => {
    if (!profile) return;
    
    const updatePayload = { ...formData };

    toast.loading('Updating profile...');
    try {
      await api.user.updateUserProfile(updatePayload);
      toast.dismiss();
      toast.success('Profile updated successfully!');
      setIsEditing(false);
      await refetch();
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
                // Add address fields if they exist in profile object
                // addressLine1: profile.address_line1 || '', 
                // addressLine2: profile.address_line2 || '',
                // city: profile.city || '', 
                // state: profile.state || '', 
                // pincode: profile.pincode || '',
                // Ensure only 'owner' or 'tenant' is passed to the form, default to null if it's 'admin' or other
                role: (profile.role === 'owner' || profile.role === 'tenant') ? profile.role : null, 
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