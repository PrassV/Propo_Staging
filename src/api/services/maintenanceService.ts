import apiClient from '../client';
import {
  MaintenanceRequest,
  MaintenanceRequestCreate,
  MaintenanceRequestUpdate,
  MaintenanceIssue
} from '../types';

// Local interface for maintenance comment creation
export interface MaintenanceCommentCreate {
  message: string;
  attachments?: string[]; // URLs of files uploaded separately
}

// Local interface for maintenance comments - will use the API response type
export interface MaintenanceComment {
  id: string;
  request_id: string;
  user_id: string;
  user_name: string;
  comment: string;
  created_at: string;
}

/**
 * Get maintenance requests for a specific unit
 * Calls GET /maintenance endpoint with unit_id filter
 */
export const getMaintenanceByUnitId = async (unitId: string): Promise<MaintenanceIssue[]> => {
  try {
    const response = await apiClient.get<{ items: MaintenanceRequest[], total: number }>('/maintenance', {
      params: { unit_id: unitId }
    });
    
    // Transform MaintenanceRequest[] to MaintenanceIssue[]
    const maintenanceIssues: MaintenanceIssue[] = (response.data.items || []).map((request: MaintenanceRequest) => ({
      id: request.id,
      title: request.description, // Using description as title since MaintenanceRequest might not have title
      status: request.status,
      priority: request.priority,
      created_at: request.created_at || new Date().toISOString(),
      property_name: '' // This would need to be fetched separately or included in the API response
    }));
    
    return maintenanceIssues;
  } catch (error: unknown) {
    console.error(`Error fetching maintenance for unit ${unitId}:`, error);
    let errorMessage = 'Failed to fetch maintenance requests';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Get all maintenance requests with optional filters
 * Calls GET /maintenance
 */
export const getMaintenanceRequests = async (params: {
  property_id?: string;
  tenant_id?: string;
  status?: string;
  priority?: string;
  category?: string;
  assigned_to?: string;
  skip?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
} = {}): Promise<{ items: MaintenanceRequest[], total: number }> => {
  try {
    const response = await apiClient.get<{ items: MaintenanceRequest[], total: number }>('/maintenance', {
      params
    });
    return response.data;
  } catch (error: unknown) {
    console.error('Error fetching maintenance requests:', error);
    let errorMessage = 'Failed to fetch maintenance requests';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Get a specific maintenance request by ID
 * Calls GET /maintenance/{id}
 */
export const getMaintenanceRequest = async (id: string): Promise<{ request: MaintenanceRequest }> => {
  try {
    const response = await apiClient.get<{ request: MaintenanceRequest }>(`/maintenance/${id}`);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error fetching maintenance request ${id}:`, error);
    let errorMessage = 'Failed to fetch maintenance request';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Get a specific maintenance request by ID
 * Calls GET /maintenance/{id}
 */
export const getMaintenanceRequestById = async (id: string): Promise<MaintenanceRequest> => {
  try {
    const response = await apiClient.get<MaintenanceRequest>(`/maintenance/${id}`);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error fetching maintenance request ${id}:`, error);
    let errorMessage = 'Failed to fetch maintenance request';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Create a new maintenance request
 * Calls POST /maintenance
 */
export const createMaintenanceRequest = async (data: MaintenanceRequestCreate): Promise<MaintenanceRequest> => {
  try {
    const response = await apiClient.post<MaintenanceRequest>('/maintenance', data);
    return response.data;
  } catch (error: unknown) {
    console.error('Error creating maintenance request:', error);
    let errorMessage = 'Failed to create maintenance request';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Update a maintenance request
 * Calls PUT /maintenance/{id}
 */
export const updateMaintenanceRequest = async (id: string, data: MaintenanceRequestUpdate): Promise<MaintenanceRequest> => {
  try {
    const response = await apiClient.put<MaintenanceRequest>(`/maintenance/${id}`, data);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error updating maintenance request ${id}:`, error);
    let errorMessage = 'Failed to update maintenance request';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Delete a maintenance request
 * Calls DELETE /maintenance/{id}
 */
export const deleteMaintenanceRequest = async (id: string): Promise<{ message: string }> => {
  try {
    const response = await apiClient.delete<{ message: string }>(`/maintenance/${id}`);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error deleting maintenance request ${id}:`, error);
    let errorMessage = 'Failed to delete maintenance request';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Get comments for a maintenance request
 * Calls GET /maintenance/{id}/comments
 */
export const getMaintenanceComments = async (requestId: string): Promise<MaintenanceComment[]> => {
  try {
    const response = await apiClient.get<MaintenanceComment[]>(`/maintenance/${requestId}/comments`);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error fetching comments for maintenance request ${requestId}:`, error);
    let errorMessage = 'Failed to fetch maintenance comments';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Add a comment to a maintenance request
 * Calls POST /maintenance/{id}/comments
 */
export const addMaintenanceComment = async (requestId: string, content: string): Promise<MaintenanceComment> => {
  try {
    const response = await apiClient.post<{ comment: MaintenanceComment }>(`/maintenance/${requestId}/comments`, { content });
    return response.data.comment;
  } catch (error: unknown) {
    console.error(`Error adding comment to maintenance request ${requestId}:`, error);
    let errorMessage = 'Failed to add comment';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Assign a maintenance request to a vendor
 * Calls PUT /maintenance/{id}/assign
 */
export const assignMaintenanceRequest = async (
  requestId: string,
  vendorId: string
): Promise<MaintenanceRequest> => {
  try {
    const response = await apiClient.put<MaintenanceRequest>(`/maintenance/${requestId}/assign`, { vendor_id: vendorId });
    return response.data;
  } catch (error: unknown) {
    console.error(`Error assigning maintenance request ${requestId} to vendor ${vendorId}:`, error);
    let errorMessage = 'Failed to assign maintenance request';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Get the count of open maintenance requests for a specific tenant
 * Calls GET /maintenance/requests/count?tenant_id={tenantId}&status=new
 */
export const getOpenTenantRequestsCount = async (tenantId: string): Promise<number> => {
  try {
    const response = await apiClient.get<{ count: number }>('/maintenance/requests/count', {
      params: {
        tenant_id: tenantId,
        status: 'new' // Assuming 'new' corresponds to 'open' requests
       }
    });
    return response.data.count ?? 0;
  } catch (error: unknown) {
    console.error(`Error fetching open maintenance request count for tenant ${tenantId}:`, error);
    let errorMessage = 'Failed to fetch request count';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};