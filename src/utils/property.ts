import { supabase, cachedQuery, batchRequests } from '../lib/supabase';
import type { Property } from '../types/property';

export const getProperty = async (propertyId: string) => {
  return cachedQuery<Property>(
    `property:${propertyId}`,
    async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (error) throw error;
      return data;
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
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', propertyId);

    if (error) throw error;

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
    const { error } = await supabase
      .from('property_tenants')
      .delete()
      .eq('id', tenantId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting tenant:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete tenant' 
    };
  }
};
