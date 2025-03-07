import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

// Delete property and its associations
export const deleteProperty = async (propertyId: string) => {
  try {
    // First, remove all tenant associations
    const { error: tenantLinkError } = await supabase
      .from('property_tenants')
      .delete()
      .eq('property_id', propertyId);

    if (tenantLinkError) throw tenantLinkError;

    // Then delete the property
    const { error: propertyError } = await supabase
      .from('properties')
      .delete()
      .eq('id', propertyId);

    if (propertyError) throw propertyError;

    toast.success('Property deleted successfully');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting property:', error);
    toast.error(error.message || 'Failed to delete property');
    return { success: false, error };
  }
};