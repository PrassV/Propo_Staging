import apiClient from '../client';

/**
 * Delete a unit by its ID
 * Calls DELETE /units/{unitId}
 */
export const deleteUnit = async (unitId: string): Promise<void> => {
  try {
    await apiClient.delete(`/units/${unitId}`);
  } catch (error: unknown) {
    console.error(`Error deleting unit ${unitId}:`, error);
    let errorMessage = 'Failed to delete unit';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
}; 