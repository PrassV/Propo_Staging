import apiClient from '../client';
// Import types from the central types file
import { 
    // Tenant, // Removed unused import
    TenantCreate, 
    TenantUpdate, 
    TenantResponse, 
    TenantsListResponse, 
    Tenant, // Assuming Tenant type is defined and exported from ../types
    TenantInvitationResponse,
    TenantInvitationVerify
} from '../types';
import { getDocuments } from './documentService';

/**
 * Get all tenants with optional filters
 * Calls GET /tenants
 */
export const getTenants = async (params: {
  property_id?: string;
  search?: string;
  status?: 'active' | 'inactive' | string;
  skip?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
} = {}): Promise<TenantsListResponse> => {
  try {
    const response = await apiClient.get<TenantsListResponse>('/tenants', { params });
    return response.data;
  } catch (error: unknown) {
    console.error("Error fetching tenants:", error);
    let errorMessage = 'Failed to fetch tenants';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Get a specific tenant by ID
 * Calls GET /tenants/{id}
 */
export const getTenantById = async (id: string): Promise<TenantResponse> => {
  try {
    console.log(`Fetching tenant by ID: ${id}`);
    const response = await apiClient.get<TenantResponse>(`/tenants/${id}`);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error fetching tenant ${id}:`, error);
    let errorMessage = 'Failed to fetch tenant details';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Create a new tenant
 * Calls POST /tenants
 */
export const createTenant = async (data: TenantCreate): Promise<TenantResponse> => {
  try {
    const response = await apiClient.post<TenantResponse>('/tenants', data);
    return response.data;
  } catch (error: unknown) {
    console.error("Error creating tenant:", error);
    let errorMessage = 'Failed to create tenant';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Update an existing tenant
 * Calls PUT /tenants/{id}
 */
export const updateTenant = async (id: string, data: TenantUpdate): Promise<TenantResponse> => {
  try {
    const response = await apiClient.put<TenantResponse>(`/tenants/${id}`, data);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error updating tenant ${id}:`, error);
    let errorMessage = 'Failed to update tenant';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Delete a tenant
 * Calls DELETE /tenants/{id}
 */
export const deleteTenant = async (id: string): Promise<{ message: string }> => {
  try {
    const response = await apiClient.delete<{ message: string }>(`/tenants/${id}`);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error deleting tenant ${id}:`, error);
    let errorMessage = 'Failed to delete tenant';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Upload tenant document
 * @deprecated This endpoint is not yet implemented in the backend
 */
export const uploadTenantDocument = async (
  _tenantId: string, 
  _documentName: string, 
  _documentUrl: string, 
  _documentType: string
): Promise<void> => {
  throw new Error('Tenant document upload is not yet implemented');
};

/**
 * Invite a tenant to a property via email
 * Calls POST /tenants/invitations
 */
export const inviteTenant = async (propertyId: string, email: string): Promise<{ message: string }> => {
  try {
    const response = await apiClient.post<{ message: string }>('/tenants/invitations', {
      property_id: propertyId,
      email: email
    });
    return response.data;
  } catch (error: unknown) {
    console.error(`Error inviting tenant to property ${propertyId}:`, error);
    let errorMessage = 'Failed to send tenant invitation';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Verify a tenant invitation
 * Calls POST /tenants/verify-invitation
 */
export const verifyInvitation = async (data: TenantInvitationVerify): Promise<TenantInvitationResponse> => {
  try {
    const response = await apiClient.post<TenantInvitationResponse>('/tenants/verify-invitation', data);
    return response.data;
  } catch (error: unknown) {
    console.error("Error verifying tenant invitation:", error);
    let errorMessage = 'Failed to verify invitation';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Verifies a tenant's property association and links their user ID via the backend.
 */
export const verifyTenantPropertyLink = async (propertyId: string): Promise<void> => {
  try {
    // Call the new backend endpoint
    // It expects { "property_id": "uuid" } in the body
    await apiClient.post(`/tenants/verify-link`, { property_id: propertyId });
    // Backend handles success/failure responses with appropriate status codes/messages
    // No specific data expected back on success besides a 200 OK.
  } catch (error) {
    console.error("Error verifying tenant property link:", error);
    // Re-throw the error so the component can handle it (e.g., show toast)
    // Consider enhancing error handling based on specific API responses if needed
    throw error;
  }
};

/**
 * Fetches the tenant profile associated with the currently authenticated user.
 * Calls GET /tenants/me
 * 
 * @returns The tenant data associated with the current user.
 * @throws Will throw an error if fetching fails or no tenant is linked.
 */
export const getCurrentTenantProfile = async (): Promise<Tenant> => { // Changed return type from any to Tenant
  try {
    // Backend endpoint returns { tenant: Tenant, message: string }
    const response = await apiClient.get<TenantResponse>('/tenants/me'); 
    
    if (response.data && response.data.tenant) {
      return response.data.tenant; // Return the nested tenant object
    } else {
      // This case might indicate an unexpected API response structure
      throw new Error('Failed to retrieve tenant profile data from API response.');
    }
  } catch (error) { // Keep refined error handling from previous step
    console.error("Error fetching current tenant profile:", error);
    // Refined error handling
    let errorMessage = 'Failed to fetch tenant profile';
    if (error && typeof error === 'object' && 'response' in error && 
        error.response && typeof error.response === 'object' && 'data' in error.response &&
        error.response.data && typeof error.response.data === 'object' && 'detail' in error.response.data) {
         errorMessage = (error.response.data as { detail: string }).detail;
    } else if (error instanceof Error) {
         errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};



/**
 * Export tenant data to CSV
 */
export const exportTenantData = async (
  _tenantIds?: string[]
): Promise<{ csv_data: string; filename: string }> => {
  try {
    // In a real implementation, this would call a backend export endpoint
    // For now, we'll return a mock response
    // const params = tenantIds ? { tenant_ids: tenantIds.join(',') } : {};
    
    // This would be replaced with actual API call
    // const response = await apiClient.get<{ csv_data: string; filename: string }>('/tenants/export', { params });
    
    // Mock implementation
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `tenants_export_${timestamp}.csv`;
    
    return {
      csv_data: 'Name,Email,Phone,Status\n', // Mock CSV header
      filename
    };
  } catch (error: unknown) {
    console.error("Error exporting tenant data:", error);
    let errorMessage = 'Failed to export tenant data';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Get tenant analytics data
 */
export const getTenantAnalytics = async (): Promise<{
  total_tenants: number;
  active_tenants: number;
  inactive_tenants: number;
  occupancy_rate: number;
  average_rent: number;
  lease_expiring_soon: number;
}> => {
  try {
    // In a real implementation, this would call a backend analytics endpoint
    // const response = await apiClient.get<AnalyticsResponse>('/tenants/analytics');
    
    // Mock implementation for now
    return {
      total_tenants: 0,
      active_tenants: 0,
      inactive_tenants: 0,
      occupancy_rate: 0,
      average_rent: 0,
      lease_expiring_soon: 0
    };
  } catch (error: unknown) {
    console.error("Error fetching tenant analytics:", error);
    let errorMessage = 'Failed to fetch tenant analytics';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};



/**
 * Get tenant documents
 */
export const getTenantDocuments = async (tenantId: string): Promise<{ documents: any[] }> => {
  try {
    // Use document service to get documents filtered by tenant_id
    const response = await getDocuments({ tenant_id: tenantId });
    return { documents: response.documents };
  } catch (error) {
    console.error("Error fetching tenant documents:", error);
    // If endpoint doesn't exist, return empty documents array
    if (error && typeof error === 'object' && 'response' in error && 
        (error as any).response?.status === 404) {
      return { documents: [] };
    }
    // Return empty array on any error for now
    return { documents: [] };
  }
};

/**
 * Get tenant history
 */
export const getTenantHistory = async (tenantId: string): Promise<{ history: any[] }> => {
  try {
    const response = await apiClient.get(`/tenants/${tenantId}/history`);
    return response.data;
  } catch (error) {
    console.error("Error fetching tenant history:", error);
    // If endpoint doesn't exist, return empty history array
    if (error && typeof error === 'object' && 'response' in error && 
        (error as any).response?.status === 404) {
      return { history: [] };
    }
    throw new Error('Failed to fetch tenant history');
  }
};

/**
 * Update tenant status
 */
export const updateTenantStatus = async (
  tenantId: string, 
  status: 'active' | 'inactive' | 'unassigned',
  reason?: string
): Promise<any> => {
  try {
    const response = await apiClient.put(`/tenants/${tenantId}/status`, {
      new_status: status,
      reason
    });
    return response.data;
  } catch (error) {
    console.error("Error updating tenant status:", error);
    throw new Error('Failed to update tenant status');
  }
};

/**
 * Download document
 */
export const downloadDocument = async (documentId: string): Promise<Blob> => {
  try {
    const response = await apiClient.get(`/documents/${documentId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error("Error downloading document:", error);
    throw new Error('Failed to download document');
  }
}; 