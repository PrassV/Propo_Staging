import { supabase } from '../lib/supabase';
import { Vendor, MaintenanceCategory } from '../types/maintenance';
import toast from 'react-hot-toast';

export async function getVendors(category?: MaintenanceCategory) {
  try {
    let query = supabase
      .from('maintenance_vendors')
      .select('*')
      .order('rating', { ascending: false });

    if (category) {
      query = query.contains('categories', [category]);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Error fetching vendors:', error);
    toast.error(error.message || 'Failed to fetch vendors');
    return { success: false, error };
  }
}

export async function createVendor(data: Partial<Vendor>) {
  try {
    const { data: vendor, error } = await supabase
      .from('maintenance_vendors')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: vendor };
  } catch (error: any) {
    console.error('Error creating vendor:', error);
    toast.error(error.message || 'Failed to create vendor');
    return { success: false, error };
  }
}