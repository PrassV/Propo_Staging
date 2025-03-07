import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, Wrench, MapPin } from 'lucide-react';
import { formatDate } from '../../utils/date';

interface RequestCardProps {
  request: {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    category: string;
    created_at: string;
    property: {
      property_name: string;
    };
  };
}

export default function RequestCard({ request }: RequestCardProps) {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'emergency': return <AlertTriangle className="text-red-500" size={16} />;
      case 'urgent': return <Clock className="text-orange-500" size={16} />;
      default: return <Wrench className="text-gray-500" size={16} />;
    }
  };

  return (
    <div 
      onClick={() => navigate(`/dashboard/maintenance/${request.id}`)}
      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold">{request.title}</h3>
          <p className="text-sm text-gray-600">{request.property.property_name}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-sm ${getStatusColor(request.status)}`}>
          {request.status.replace('_', ' ')}
        </span>
      </div>

      <p className="text-gray-600 text-sm mb-4">{request.description}</p>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            {getPriorityIcon(request.priority)}
            <span className="capitalize">{request.priority}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Wrench size={16} />
            <span className="capitalize">{request.category}</span>
          </div>
        </div>
        <span className="text-gray-500">
          {formatDate(request.created_at)}
        </span>
      </div>
    </div>
  );
}