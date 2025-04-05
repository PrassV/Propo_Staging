import { useState } from 'react';
import { Search } from 'lucide-react';
import RequestCard from './RequestCard';
import { useMaintenanceApi } from '../../hooks/useMaintenanceApi';
import LoadingSpinner from '../common/LoadingSpinner';
import { MaintenanceRequest } from '../../api/services/maintenanceService';

interface MaintenanceRequestListProps {
  propertyId?: string;
  userType?: 'owner' | 'tenant' | 'admin' | null;
}

// Define an interface for the transformed request that matches what RequestCard expects
interface TransformedRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  updated_at: string;
  location: string;
  property: {
    id: string;
    property_name: string;
  };
}

export default function MaintenanceRequestList({ propertyId, userType }: MaintenanceRequestListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    category: 'all'
  });

  // Use the new API hook with filters
  const apiFilters = {
    property_id: propertyId,
    // Add status filter if not 'all'
    ...(filters.status !== 'all' && { status: filters.status }),
    // Add priority filter if not 'all'
    ...(filters.priority !== 'all' && { priority: filters.priority })
  };

  const { requests, loading, error, refetch } = useMaintenanceApi(apiFilters);

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description?.toLowerCase().includes(searchTerm.toLowerCase());

    // Category is filtered on the client side since the API doesn't support it
    const matchesCategory = filters.category === 'all' || request.category === filters.category;

    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-8 text-red-600">
          Error loading maintenance requests: {error}
          <button onClick={refetch} className="ml-2 underline">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-black"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:border-black"
          >
            <option value="all">All Status</option>
            <option value="pending">New</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:border-black"
          >
            <option value="all">All Priority</option>
            <option value="emergency">Emergency</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:border-black"
          >
            <option value="all">All Categories</option>
            <option value="plumbing">Plumbing</option>
            <option value="electrical">Electrical</option>
            <option value="hvac">HVAC</option>
            <option value="structural">Structural</option>
            <option value="appliance">Appliance</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            {searchTerm || filters.status !== 'all' || filters.priority !== 'all' || filters.category !== 'all'
              ? 'No requests match your filters'
              : 'No maintenance requests found'}
          </div>
        ) : (
          filteredRequests.map(request => (
            <RequestCard 
              key={request.id} 
              request={adaptRequestToLegacyFormat(request)} 
            />
          ))
        )}
      </div>
    </div>
  );
}

// Helper function to adapt API request format to legacy format expected by RequestCard
function adaptRequestToLegacyFormat(request: MaintenanceRequest): TransformedRequest {
  return {
    id: request.id,
    title: request.title,
    description: request.description,
    status: request.status,
    priority: request.priority,
    category: request.category,
    created_at: request.created_at,
    updated_at: request.updated_at,
    location: '',
    property: {
      id: request.property_id,
      property_name: 'Property' // Placeholder property name
    }
  };
}