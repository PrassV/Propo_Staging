import apiClient from '../client';
import axios from 'axios';
import { UnitHistory } from '../types';

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

/**
 * Get comprehensive history for a unit including all past tenants, leases, payments, and maintenance
 */
export const getUnitHistory = async (unitId: string): Promise<UnitHistory> => {
  try {
    const response = await apiClient.get<UnitHistory>(`/units/${unitId}/history`);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error fetching unit history for ${unitId}:`, error);
    let errorMessage = 'Failed to fetch unit history';
    if (axios.isAxiosError(error)) {
      errorMessage = error.response?.data?.detail || error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
}; 