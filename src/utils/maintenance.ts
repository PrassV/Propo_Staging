import { supabase } from '../lib/supabase';
import { MaintenanceRequest } from '../types/maintenance';
import toast from 'react-hot-toast';

export async function getMaintenanceRequests(propertyId?: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // First get the user's properties
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('owner_id', user.id);

    if (!properties) return { success: true, data: [] };
    
    const propertyIds = properties.map(p => p.id);

    let query = supabase
      .from('maintenance_requests')
      .select(`
        *,
        property:properties(
          id,
          property_name,
          address_line1,
          city
        ),
        vendor:maintenance_vendors(name)
      `)
      .in('property_id', propertyIds)
      .order('created_at', { ascending: false });

    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Error fetching maintenance requests:', error);
    toast.error(error.message || 'Failed to fetch requests');
    return { success: false, error };
  }
}

export async function createMaintenanceRequest(data: Partial<MaintenanceRequest>) {
  try {
    const { data: request, error } = await supabase
      .from('maintenance_requests')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: request };
  } catch (error: any) {
    console.error('Error creating maintenance request:', error);
    toast.error(error.message || 'Failed to create request');
    return { success: false, error };
  }
}

export async function updateMaintenanceRequest(id: string, data: Partial<MaintenanceRequest>) {
  try {
    const { error } = await supabase
      .from('maintenance_requests')
      .update(data)
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating maintenance request:', error);
    toast.error(error.message || 'Failed to update request');
    return { success: false, error };
  }
}