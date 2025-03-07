import { User } from 'lucide-react';

interface ProfileViewProps {
  profile: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  onEdit: () => void;
}

export default function ProfileView({ profile, onEdit }: ProfileViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-gray-100 p-3 rounded-full">
            <User className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              {profile.first_name} {profile.last_name}
            </h2>
            <p className="text-gray-600">{profile.email}</p>
          </div>
        </div>
        <button
          onClick={onEdit}
          className="text-sm bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Edit Profile
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-gray-500">Contact Information</h3>
          <div className="mt-2 space-y-2">
            <p className="text-gray-900">{profile.phone || 'Not provided'}</p>
            <p className="text-gray-900">{profile.email}</p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-500">Address</h3>
          <div className="mt-2 space-y-1">
            <p className="text-gray-900">{profile.address_line1}</p>
            {profile.address_line2 && (
              <p className="text-gray-900">{profile.address_line2}</p>
            )}
            <p className="text-gray-900">
              {[profile.city, profile.state, profile.pincode]
                .filter(Boolean)
                .join(', ')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}