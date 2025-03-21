import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import { Tenant as ApiTenant } from '../api/types';

// Map to a frontend tenant model if needed
export interface FrontendTenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  property_id: string;
  move_in_date?: string;
  lease_end_date?: string;
  rent_amount?: number;
  rent_frequency?: string;
  tenant_type?: string;
  created_at: string;
  updated_at: string;
}

// Function to convert API tenant to frontend tenant model if needed
function adaptApiTenant(apiTenant: ApiTenant): FrontendTenant {
  return {
    id: apiTenant.id,
    name: apiTenant.name,
    email: apiTenant.email,
    phone: apiTenant.phone || '',
    property_id: apiTenant.property_id,
    move_in_date: apiTenant.move_in_date,
    lease_end_date: apiTenant.lease_end_date,
    rent_amount: apiTenant.rent_amount,
    rent_frequency: apiTenant.rent_frequency,
    tenant_type: apiTenant.tenant_type,
    created_at: apiTenant.created_at,
    updated_at: apiTenant.updated_at,
  };
}

export function useTenantsApi(propertyId?: string) {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<FrontendTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenants = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const apiTenants = await api.tenant.getTenants(propertyId);
      // Convert API tenants to frontend tenant model
      const adaptedTenants = apiTenants.map(adaptApiTenant);
      setTenants(adaptedTenants);
    } catch (error: unknown) {
      console.error('Error fetching tenants:', error);
      let errorMessage = 'Failed to fetch tenants';
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

  // Remove tenant from local state
  const removeTenant = (tenantId: string) => {
    setTenants(prev => prev.filter(t => t.id !== tenantId));
  };

  // Add tenant to local state
  const addTenant = (tenant: FrontendTenant) => {
    setTenants(prev => [...prev, tenant]);
  };

  // Update tenant in local state
  const updateTenant = (tenantId: string, updatedTenant: Partial<FrontendTenant>) => {
    setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, ...updatedTenant } : t));
  };

  useEffect(() => {
    if (user) {
      fetchTenants();
    }
  }, [user, propertyId]);

  return { 
    tenants, 
    loading, 
    error, 
    refetch: fetchTenants, 
    removeTenant,
    addTenant,
    updateTenant
  };
} 