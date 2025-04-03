import apiClient from '../client';
// Import types from the central types file
import { 
    // Tenant, // Removed unused import
    TenantCreate, 
    TenantUpdate, 
    TenantResponse, 
    TenantsListResponse, 
    Tenant, // Assuming Tenant type is defined and exported from ../types
    TenantInvitationCreate,
    TenantInvitationResponse,
    TenantInvitationVerify
} from '../types';

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

/*
// TODO: Uncomment and adjust when backend document upload/linking endpoint for tenants is confirmed.
// The endpoint `/tenants/{tenantId}/documents` does not seem to exist in the current backend API.
// Verify the correct endpoint and data format (e.g., direct upload or passing URL).

// Upload tenant document
export const uploadTenantDocument = async (
  tenantId: string, 
  documentName: string, 
  documentUrl: string, 
  documentType: string
): Promise<Tenant> => { // Adjust return type based on actual backend response
  const formData = new FormData();
  formData.append('document_name', documentName);
  formData.append('document_url', documentUrl);
  formData.append('document_type', documentType);
  
  const response = await apiClient.post<TenantResponse>( // Use correct response type
    `/tenants/${tenantId}/documents`, // Use the correct backend endpoint
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data', // Check if this is correct or if it should be application/json
      },
    }
  );
  
  return response.data.tenant; // Adjust based on actual backend response structure
};
*/

/**
 * Invite a tenant to register
 * Calls POST /tenants/invite
 */
export const inviteTenant = async (data: TenantInvitationCreate): Promise<TenantInvitationResponse> => {
  try {
    const response = await apiClient.post<TenantInvitationResponse>('/tenants/invite', data);
    return response.data;
  } catch (error: unknown) {
    console.error("Error inviting tenant:", error);
    let errorMessage = 'Failed to send tenant invitation';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
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