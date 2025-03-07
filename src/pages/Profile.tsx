import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import LoadingSpinner from '../components/common/LoadingSpinner';
import UserTypeSwitch from '../components/onboarding/UserTypeSwitch';
import ProfileView from '../components/profile/ProfileView';
import ProfileForm from '../components/profile/ProfileForm';

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading, refetch } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);

  if (loading) return <LoadingSpinner />;
  if (!profile) return null;

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
          currentType={profile.user_type} 
          onSwitch={() => navigate('/onboarding')} 
        />

        <div className="mt-8">
          {isEditing ? (
            <ProfileForm
              initialData={{
                id: user?.id,
                firstName: profile.first_name,
                lastName: profile.last_name,
                phone: profile.phone,
                addressLine1: profile.address_line1,
                addressLine2: profile.address_line2,
                city: profile.city,
                state: profile.state,
                pincode: profile.pincode
              }}
              onSave={async () => {
                setIsEditing(false);
                await refetch();
              }}
              onCancel={() => setIsEditing(false)}
              loading={updating}
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