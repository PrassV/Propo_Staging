import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Property } from '../types/property';
import api from '../api';
import { Property as ApiProperty } from '../api/types';

// Function to convert API property to frontend property model
function adaptApiProperty(apiProperty: ApiProperty): Property {
  return {
    id: apiProperty.id,
    property_name: apiProperty.property_name,
    property_type: apiProperty.property_type,
    address_line1: apiProperty.address_line1,
    address_line2: apiProperty.address_line2,
    city: apiProperty.city,
    state: apiProperty.state,
    pincode: apiProperty.zip_code, // Map zip_code to pincode
    image_url: apiProperty.image_url,
    description: apiProperty.description,
    bedrooms: apiProperty.bedrooms,
    bathrooms: apiProperty.bathrooms,
    size_sqft: apiProperty.area,
    year_built: apiProperty.year_built,
    tenants: apiProperty.tenants?.map(tenant => ({
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone || '',
    })) || [],
  };
}

export function usePropertiesApi() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [totalProperties, setTotalProperties] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const response = await api.property.getProperties();
      const adaptedProperties = response.items.map(adaptApiProperty);
      setProperties(adaptedProperties);
      setTotalProperties(response.total);
    } catch (error: unknown) {
      console.error('Error fetching properties:', error);
      let errorMessage = 'Failed to fetch properties';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'formattedMessage' in error) {
        errorMessage = (error as { formattedMessage: string }).formattedMessage;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const removeProperty = (propertyId: string) => {
    setProperties(prev => prev.filter(p => p.id !== propertyId));
    setTotalProperties(prev => prev - 1);
  };

  const addProperty = (property: Property) => {
    setProperties(prev => [...prev, property]);
    setTotalProperties(prev => prev + 1);
  };

  const updateProperty = (propertyId: string, updatedFields: Partial<Property>) => {
    setProperties(prev => prev.map(p => p.id === propertyId ? { ...p, ...updatedFields } : p));
  };

  useEffect(() => {
    if (user) {
      fetchProperties();
    }
  }, [user]);

  return { 
    properties, 
    totalProperties,
    loading, 
    error, 
    refetch: fetchProperties, 
    removeProperty,
    addProperty,
    updateProperty
  };
} 