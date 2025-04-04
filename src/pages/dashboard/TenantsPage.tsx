import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api'; // Import API client
import { Property, Tenant } from '../../api/types'; // Import types
import TenantList from '../../components/tenant/TenantList';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'; // Use Alert component

export default function TenantsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch properties owned by the user
      // Assuming getProperties doesn't need owner_id (uses token)
      // or adjust params if it does: await api.property.getProperties({ owner_id: user?.id });
      const propertiesResponse = await api.property.getProperties();
      const fetchedProperties = propertiesResponse.items || [];
      setProperties(fetchedProperties);

      // 2. Fetch tenants for these properties
      const propertyIds = fetchedProperties.map(p => p.id);
      if (propertyIds.length === 0) {
        setTenants([]); // No properties, no tenants
        setLoading(false);
        return;
      }
      
      // Fetch all tenants and filter client-side, OR 
      // update backend to accept property_ids filter
      const tenantsResponse = await api.tenant.getTenants(); // Fetch all
      const filteredTenants = tenantsResponse.items.filter(t => 
          propertyIds.includes(t.property_id)
      );
      setTenants(filteredTenants);
      
    } catch (err: unknown) {
      console.error('Error fetching data:', err);
      const message = err instanceof Error ? err.message : 'Failed to load tenant data';
      setError(message);
    } finally {
      setLoading(false);
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
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <button 
              onClick={fetchData}
              className="mt-2 text-sm underline block"
            >
              Try again
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-wide">Tenants</h1>
        <p className="text-gray-600">Manage your tenants across all properties</p>
      </div>

      {properties.length === 0 && (
          <p>You haven't added any properties yet.</p> // Add message for no properties
      )}

      {properties.map(property => (
        <div key={property.id} className="mb-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">{property.property_name}</h2>
          <TenantList
            tenants={tenants.filter(t => t.property_id === property.id)}
            property={property}
            onUpdate={fetchData} // Refresh data on updates
            showFullDetails
          />
        </div>
      ))}
    </div>
  );
}