import { supabase } from '../lib/supabase';
import { Vendor, MaintenanceCategory } from '../types/maintenance';
import toast from 'react-hot-toast';

interface SupabaseError {
  message: string;
  details: string;
  hint: string;
  code: string;
}

export async function getVendors(category?: MaintenanceCategory) {
  try {

    // If not in cache, fetch from database
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
  } catch (error: unknown) {
    const err = error as Error | SupabaseError;
    console.error('Error fetching vendors:', err);
    toast.error(err.message || 'Failed to fetch vendors');
    return { success: false, error: err };
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
  } catch (error: unknown) {
    const err = error as Error | SupabaseError;
    console.error('Error creating vendor:', err);
    toast.error(err.message || 'Failed to create vendor');
    return { success: false, error: err };
  }
}