import apiClient from '../client';
import { Lease, LeaseCreate } from '../types';
import axios from 'axios';

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
export const getLeaseByUnitId = async (unitId: string): Promise<Lease> => {
  try {
    const response = await apiClient.get<Lease>('/leases', {
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
export const getLeaseById = async (leaseId: string): Promise<Lease> => {
  try {
    const response = await apiClient.get<Lease>(`/leases/${leaseId}`);
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
export const createLease = async (data: LeaseCreate): Promise<Lease> => {
  try {
    const response = await apiClient.post<Lease>('/leases/', data);
    return response.data;
  } catch (error: unknown) {
    console.error("Error creating lease:", error);
    let errorMessage = 'Failed to create lease';
    if (axios.isAxiosError(error)) {
      // Use the detailed error message from the backend if available
      errorMessage = error.response?.data?.detail || error.message;
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
export const updateLease = async (leaseId: string, leaseData: Partial<Lease>): Promise<Lease> => {
  try {
    const response = await apiClient.put<Lease>(`/leases/${leaseId}`, leaseData);
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
export const getLeases = async (params: LeaseParams = {}): Promise<{ items: Lease[]; total?: number; message?: string }> => {
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

/**
 * Terminates a lease.
 * @param leaseId The ID of the lease to terminate.
 * @returns A promise that resolves on success.
 */
export const terminateLease = async (leaseId: string): Promise<void> => {
    try {
        await apiClient.put(`/leases/${leaseId}/terminate`);
    } catch (error: unknown) {
        console.error(`Error terminating lease ${leaseId}:`, error);
        let errorMessage = 'Failed to terminate lease';
        if (axios.isAxiosError(error)) {
            errorMessage = error.response?.data?.detail || error.message;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
    }
};