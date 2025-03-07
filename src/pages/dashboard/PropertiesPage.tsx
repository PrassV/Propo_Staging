import { useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProperties } from '../../hooks/useProperties';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { deleteProperty } from '../../utils/property';

export default function PropertiesPage() {
  const { properties, loading, error, refetch, removeProperty } = useProperties();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProperties = properties.filter(property => 
    property.property_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.address_line1.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteProperty = async (propertyId: string) => {
    if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }

    const result = await deleteProperty(propertyId);
    if (result.success) {
      removeProperty(propertyId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          <p>{error}</p>
          <button onClick={refetch} className="mt-2 text-sm underline">Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Properties</h1>
          <p className="text-gray-600">Manage your property portfolio</p>
        </div>
        <Link
          to="/dashboard/properties/add"
          className="flex items-center space-x-2 bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus size={20} />
          <span>Add Property</span>
        </Link>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search properties..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-black"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProperties.map(property => (
          <div key={property.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="relative h-48">
              <img
                src={property.image_url || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80"}
                alt={property.property_name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h2 className="text-white font-semibold text-lg">{property.property_name}</h2>
                <p className="text-white/80 text-sm">{property.address_line1}, {property.city}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteProperty(property.id);
                }}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                title="Delete Property"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 divide-x divide-y">
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-1">Rent Status</p>
                <p className="font-semibold text-green-600">Paid</p>
                <p className="text-xs text-gray-500 mt-1">
                  Last paid: {new Date().toLocaleDateString()}
                </p>
              </div>

              <div className="p-4">
                <p className="text-sm text-gray-600 mb-1">Property Tax</p>
                <p className="font-semibold text-green-600">Paid</p>
              </div>

              <div className="p-4">
                <p className="text-sm text-gray-600 mb-1">Maintenance</p>
                <p className="font-semibold text-green-600">No Issues</p>
              </div>

              <div className="p-4">
                <p className="text-sm text-gray-600 mb-1">Occupancy</p>
                <p className="font-semibold">
                  {property.tenants?.length || 0} Tenant{property.tenants?.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="p-4 border-t">
              <Link
                to={`/property/${property.id}`}
                className="block w-full text-center text-black hover:text-gray-600"
              >
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}