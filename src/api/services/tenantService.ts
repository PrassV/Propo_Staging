import apiClient from '../client';
// Import necessary types, including the new response types
// Removed Tenant, TenantInvitation, TenantInvitationCreate, TenantInvitationResponse as they are unused after commenting out functions
import { 
  TenantCreate, 
  TenantUpdate, 
  TenantResponse, 
  TenantsListResponse
} from '../types';

// Get all tenants - Matches backend response structure
export const getTenants = async (propertyId?: string): Promise<TenantsListResponse> => {
  const params = propertyId ? { property_id: propertyId } : {};
  const response = await apiClient.get<TenantsListResponse>('/tenants', { params });
  // Return the full response object { items: Tenant[], total: number, message: string }
  return response.data;
};

// Get a single tenant by ID - Matches backend response structure
export const getTenantById = async (id: string): Promise<TenantResponse> => {
  const response = await apiClient.get<TenantResponse>(`/tenants/${id}`);
  // Return the full response object { tenant: Tenant, message: string }
  return response.data;
};

// Create a new tenant - Matches backend response structure
export const createTenant = async (tenantData: TenantCreate): Promise<TenantResponse> => {
  const response = await apiClient.post<TenantResponse>('/tenants', tenantData);
  // Return the full response object { tenant: Tenant, message: string }
  return response.data;
};

// Update an existing tenant - Matches backend response structure
export const updateTenant = async (id: string, tenantData: TenantUpdate): Promise<TenantResponse> => {
  const response = await apiClient.put<TenantResponse>(`/tenants/${id}`, tenantData);
  // Return the full response object { tenant: Tenant, message: string }
  return response.data;
};

// Delete a tenant - Backend returns 204 No Content
export const deleteTenant = async (id: string): Promise<void> => {
  await apiClient.delete(`/tenants/${id}`);
  // No return value for 204 response
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

/*
// TODO: Uncomment and adjust based on the actual backend invitation flow.
// Backend endpoint seems to be `POST /tenants/{tenant_id}/invite`, not `/invitations`.
// Verify request body and response structure.

// Invite a tenant
export const inviteTenant = async (invitationData: TenantInvitationCreate): Promise<TenantInvitationResponse> => {
  // Use the correct endpoint: `/tenants/{tenant_id}/invite`?
  const response = await apiClient.post<TenantInvitationResponse>('/invitations', invitationData);
  return response.data;
};
*/

/*
// TODO: Uncomment and adjust based on the actual backend invitation flow.
// Endpoints `/invitations/verify/{token}` and `/invitations/accept/{token}` don't seem to exist.
// How is invitation verification/acceptance handled in the backend?

// Verify a tenant invitation
export const verifyInvitation = async (token: string): Promise<TenantInvitation> => { // Adjust return type
  const response = await apiClient.get<TenantInvitationResponse>(`/invitations/verify/${token}`); // Endpoint needs verification
  return response.data.invitation; // Adjust based on response
};

// Accept a tenant invitation
export const acceptInvitation = async (token: string, userId: string): Promise<TenantInvitation> => { // Adjust return type
  const response = await apiClient.post<TenantInvitationResponse>(`/invitations/accept/${token}`, { user_id: userId }); // Endpoint needs verification
  return response.data.invitation; // Adjust based on response
};
*/ 