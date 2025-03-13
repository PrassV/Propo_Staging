import { apiFetch } from './api';

export interface DeleteResult {
  success: boolean;
  error?: string;
}

export const deleteProperty = async (propertyId: string): Promise<DeleteResult> => {
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