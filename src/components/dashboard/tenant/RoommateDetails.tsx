import { UserPlus } from 'lucide-react';

interface RoommateDetailsProps {
  roommates: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    university?: string;
  }>;
  propertyId: string;
}

export default function RoommateDetails({ roommates, propertyId }: RoommateDetailsProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Roommate Details</h2>
        <button
          onClick={() => {/* TODO: Implement roommate change request */}}
          className="flex items-center space-x-2 text-sm text-black hover:text-gray-600"
        >
          <UserPlus size={16} />
          <span>Change Roommate</span>
        </button>
      </div>

      {roommates.length > 0 ? (
        <div className="space-y-4">
          {roommates.map((roommate) => (
            <div key={roommate.id} className="space-y-1">
              <p className="font-medium">{roommate.name}</p>
              <p className="text-sm text-gray-600">{roommate.email}</p>
              <p className="text-sm text-gray-600">{roommate.phone}</p>
              {roommate.university && (
                <p className="text-sm text-gray-600">University: {roommate.university}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600">No roommates assigned yet.</p>
      )}
    </div>
  );
}