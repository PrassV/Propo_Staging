import { cachedQuery, batchRequests } from '../lib/supabase';
import { apiFetch } from './api';
import type { Property } from '../types/property';

export const getProperty = async (propertyId: string) => {
  return cachedQuery<Property>(
    `property:${propertyId}`,
    async () => {
      const response = await apiFetch(`properties/${propertyId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch property');
      }
      
      return await response.json();
    },
    5 * 60 * 1000 // 5 minutes cache
  );
};

export const getPropertiesWithDetails = async (propertyIds: string[]) => {
  const requests = propertyIds.map(id => () => getProperty(id));
  return batchRequests(requests, 3);
};

export const deleteProperty = async (propertyId: string) => {
  try {
    const response = await apiFetch(`properties/${propertyId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to delete property');
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting property:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete property' 
    };
  }
};

export const deleteTenant = async (tenantId: string) => {
  try {
    const response = await apiFetch(`invitations/tenant/${tenantId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to delete tenant');
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting tenant:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete tenant' 
    };
  }
};
