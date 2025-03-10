import { supabase } from '../lib/supabase';

export interface DeleteResult {
  success: boolean;
  error?: string;
}

export const deleteProperty = async (propertyId: string): Promise<DeleteResult> => {
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