import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
// Remove unused useAuth import if user is not needed
// import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import LoadingSpinner from '../components/common/LoadingSpinner';
import UserTypeSwitch from '../components/onboarding/UserTypeSwitch';
import ProfileView from '../components/profile/ProfileView';
import ProfileForm from '../components/profile/ProfileForm';

export default function Profile() {
  const navigate = useNavigate();
  // Removed unused user variable
  // const { user } = useAuth();
  const { profile, loading, refetch } = useProfile();
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!loading && !profile?.role) {
      // If loading is done and role is still missing, force edit mode?
      // Or rely on UserTypeSwitch to handle this visually?
      // For now, let's assume UserTypeSwitch handles the visual cue.
      // setIsEditing(true); 
    }
  }, [loading, profile]);

  if (loading) return <LoadingSpinner />;
  if (!profile) return <div className="p-6">Error loading profile data.</div>;

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

        <UserTypeSwitch 
          currentType={profile.role === 'admin' ? null : profile.role}
          onSwitch={() => navigate('/onboarding')} 
        />

        <div className="mt-8">
          {isEditing ? (
            <ProfileForm
              initialData={{
                firstName: profile.first_name || '', 
                lastName: profile.last_name || '',
                phone: profile.phone || '',
              }}
              onSave={async () => {
                setIsEditing(false);
                await refetch();
              }}
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