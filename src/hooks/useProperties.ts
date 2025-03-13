import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Property } from '../types/property';
import { apiFetch } from '../utils/api';

interface ApiPropertyResponse {
  id: string;
  property_name: string;
  property_type: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  image_url?: string;
  description?: string;
  size_sqft?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  tenants?: Array<{
    tenant: {
      id: string;
      name: string;
      email: string;
      phone?: string;
    }
  }>;
  [key: string]: unknown; // For other fields
}

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

      // Use FastAPI endpoint instead of direct Supabase call
      const response = await apiFetch(`properties/user/${user.id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch properties');
      }
      
      const data = await response.json() as ApiPropertyResponse[];

      // Transform API response to match Property type
      const formattedProperties: Property[] = data.map(property => ({
        id: property.id,
        property_name: property.property_name,
        property_type: property.property_type,
        address_line1: property.address_line1,
        address_line2: property.address_line2,
        city: property.city,
        state: property.state,
        pincode: property.pincode,
        image_url: property.image_url,
        description: property.description,
        size_sqft: property.size_sqft,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        amenities: property.amenities,
        tenants: property.tenants?.map(pt => ({
          id: pt.tenant.id,
          name: pt.tenant.name,
          email: pt.tenant.email,
          phone: pt.tenant.phone || '' // Ensure phone is always a string
        })) || []
      }));

      setProperties(formattedProperties);
    } catch (error) {
      console.error('Error fetching properties:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
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