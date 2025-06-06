import apiClient from '../client';
import { LeaseAgreement } from '../types';

interface LeaseParams {
  property_id?: string;
  tenant_id?: string;
  active_only?: boolean;
  skip?: number;
  limit?: number;
}

/**
 * Get lease agreement by unit ID
 * Calls GET /leases endpoint with unit_id parameter
 */
export const getLeaseByUnitId = async (unitId: string): Promise<LeaseAgreement> => {
  try {
    const response = await apiClient.get<LeaseAgreement>('/leases', {
      params: { unit_id: unitId }
    });
    return response.data;
  } catch (error: unknown) {
    console.error(`Error fetching lease for unit ${unitId}:`, error);
    let errorMessage = 'Failed to fetch lease agreement';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Get specific lease agreement by ID
 * Calls GET /leases/{id}
 */
export const getLeaseById = async (leaseId: string): Promise<LeaseAgreement> => {
  try {
    const response = await apiClient.get<LeaseAgreement>(`/leases/${leaseId}`);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error fetching lease ${leaseId}:`, error);
    let errorMessage = 'Failed to fetch lease agreement';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Create a new lease agreement
 * Calls POST /leases
 */
export const createLease = async (leaseData: Partial<LeaseAgreement>): Promise<LeaseAgreement> => {
  try {
    const response = await apiClient.post<LeaseAgreement>('/leases', leaseData);
    return response.data;
  } catch (error: unknown) {
    console.error('Error creating lease:', error);
    let errorMessage = 'Failed to create lease agreement';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Update a lease agreement
 * Calls PUT /leases/{id}
 */
export const updateLease = async (leaseId: string, leaseData: Partial<LeaseAgreement>): Promise<LeaseAgreement> => {
  try {
    const response = await apiClient.put<LeaseAgreement>(`/leases/${leaseId}`, leaseData);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error updating lease ${leaseId}:`, error);
    let errorMessage = 'Failed to update lease agreement';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Delete a lease agreement
 * Calls DELETE /leases/{id}
 */
export const deleteLease = async (leaseId: string): Promise<{ message: string }> => {
  try {
    const response = await apiClient.delete<{ message: string }>(`/leases/${leaseId}`);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error deleting lease ${leaseId}:`, error);
    let errorMessage = 'Failed to delete lease agreement';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Get all leases with optional filtering
 * Calls GET /leases with optional parameters
 */
export const getLeases = async (params: LeaseParams = {}): Promise<{ items: LeaseAgreement[]; total?: number; message?: string }> => {
  try {
    const response = await apiClient.get('/leases', { params });
    return response.data;
  } catch (error: unknown) {
    console.error('Error fetching leases:', error);
    let errorMessage = 'Failed to fetch leases';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Alias for getLeaseById for backward compatibility
 * @deprecated Use getLeaseById instead
 */
export const getLease = getLeaseById;