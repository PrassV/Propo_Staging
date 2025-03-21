import { Building2, Home, Users } from 'lucide-react';
import { useDashboardSummary } from '../../hooks/useDashboardApi';
import LoadingSpinner from '../common/LoadingSpinner';

const PropertyStats = () => {
  const { summary, loading, error } = useDashboardSummary();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="bg-red-50 rounded-lg p-4 text-red-600">
        <p>Error loading property statistics: {error || 'Unknown error'}</p>
      </div>
    );
  }

  const stats = {
    total: summary.total_properties,
    occupied: summary.occupied_units,
    vacant: summary.vacant_units,
    residential: summary.total_properties - 0, // We don't have residential/commercial split in the API yet
    commercial: 0 // We don't have this data yet
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-600 font-medium">Total Properties</p>
            <h3 className="text-3xl font-bold mt-2">{stats.total}</h3>
          </div>
          <div className="bg-black/5 p-3 rounded-lg">
            <Building2 className="text-black" size={24} />
          </div>
        </div>
        <div className="mt-4 flex items-center space-x-6">
          <div>
            <p className="text-sm text-gray-600">Residential</p>
            <p className="font-semibold mt-1">{stats.residential}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Commercial</p>
            <p className="font-semibold mt-1">{stats.commercial}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-600 font-medium">Occupied Units</p>
            <h3 className="text-3xl font-bold mt-2">{stats.occupied}</h3>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <Home className="text-green-600" size={24} />
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-500" 
              style={{ 
                width: `${stats.total ? (stats.occupied / stats.total) * 100 : 0}%` 
              }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {stats.total ? Math.round((stats.occupied / stats.total) * 100) : 0}% occupied
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-600 font-medium">Vacant Units</p>
            <h3 className="text-3xl font-bold mt-2">{stats.vacant}</h3>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <Users className="text-blue-600" size={24} />
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
              style={{ 
                width: `${stats.total ? (stats.vacant / stats.total) * 100 : 0}%` 
              }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {stats.total ? Math.round((stats.vacant / stats.total) * 100) : 0}% vacant
          </p>
        </div>
      </div>
    </div>
  );
};

export default PropertyStats;