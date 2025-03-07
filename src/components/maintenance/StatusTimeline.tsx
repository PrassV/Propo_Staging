import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useProfile';

interface StatusTimelineProps {
  request: any;
  onUpdateStatus: (status: string) => void;
}

export default function StatusTimeline({ request, onUpdateStatus }: StatusTimelineProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const isOwner = profile?.user_type === 'owner';

  const statuses = [
    { value: 'new', label: 'New Request', icon: AlertCircle },
    { value: 'in_progress', label: 'In Progress', icon: Clock },
    { value: 'completed', label: 'Completed', icon: CheckCircle }
  ];

  const currentStatusIndex = statuses.findIndex(s => s.value === request.status);

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
      
      <div className="space-y-8">
        {statuses.map((status, index) => {
          const isPast = index <= currentStatusIndex;
          const Icon = status.icon;
          
          return (
            <div key={status.value} className="relative flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 
                ${isPast ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                <Icon size={16} />
              </div>
              
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${isPast ? 'text-green-600' : 'text-gray-600'}`}>
                    {status.label}
                  </span>
                  {isPast && index === currentStatusIndex && (
                    <span className="text-sm text-gray-500">
                      Current Status
                    </span>
                  )}
                </div>
                
                {isOwner && index === currentStatusIndex + 1 && (
                  <button
                    onClick={() => onUpdateStatus(status.value)}
                    className="mt-2 text-sm bg-black text-white px-4 py-1 rounded-lg hover:bg-gray-800"
                  >
                    Mark as {status.label}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}