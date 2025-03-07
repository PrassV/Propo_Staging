import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import TenantList from '../../components/tenant/TenantList';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function TenantsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all properties owned by the user
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', user?.id);

      if (propertiesError) throw propertiesError;
      setProperties(propertiesData);

      // Get all tenants for these properties
      const propertyIds = propertiesData.map(p => p.id);
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select(`
          *,
          property_tenants!inner(
            property:properties(*)
          )
        `)
        .in('property_tenants.property_id', propertyIds);

      if (tenantsError) throw tenantsError;
      setTenants(tenantsData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError(error.message);
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
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          <p>{error}</p>
          <button 
            onClick={fetchData}
            className="mt-2 text-sm underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-wide">Tenants</h1>
        <p className="text-gray-600">Manage your tenants across all properties</p>
      </div>

      {properties.map(property => (
        <div key={property.id} className="mb-8">
          <h2 className="text-xl font-semibold mb-4">{property.property_name}</h2>
          <TenantList
            tenants={tenants.filter(t => 
              t.property_tenants.some((pt: any) => pt.property.id === property.id)
            )}
            property={property}
            onUpdate={fetchData}
            showFullDetails
          />
        </div>
      ))}
    </div>
  );
}