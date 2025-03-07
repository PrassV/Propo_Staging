import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Property } from '../types/property';

export function useProperties() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('properties')
        .select(`
          *,
          tenants:property_tenants(
            tenant:tenants(*)
          )
        `)
        .eq('owner_id', user.id);

      if (fetchError) throw fetchError;

      const formattedProperties = data?.map(property => ({
        ...property,
        tenants: property.tenants?.map((pt: any) => pt.tenant) || []
      })) || [];

      setProperties(formattedProperties);
    } catch (error: any) {
      console.error('Error fetching properties:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Remove property from local state
  const removeProperty = (propertyId: string) => {
    setProperties(prev => prev.filter(p => p.id !== propertyId));
  };

  useEffect(() => {
    if (user) {
      fetchProperties();
    }
  }, [user]);

  return { properties, loading, error, refetch: fetchProperties, removeProperty };
}