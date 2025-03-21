import apiClient from '../client';
import { ApiResponse, Tenant, TenantCreate, TenantUpdate, TenantInvitation, TenantInvitationCreate } from '../types';

// Get all tenants with optional property filter
export const getTenants = async (propertyId?: string): Promise<Tenant[]> => {
  const params = propertyId ? { property_id: propertyId } : {};
  const response = await apiClient.get<ApiResponse<Tenant[]>>('/tenants', { params });
  return response.data.data;
};

// Get a single tenant by ID
export const getTenantById = async (id: string): Promise<Tenant> => {
  const response = await apiClient.get<ApiResponse<Tenant>>(`/tenants/${id}`);
  return response.data.data;
};

// Create a new tenant
export const createTenant = async (tenantData: TenantCreate): Promise<Tenant> => {
  const response = await apiClient.post<ApiResponse<Tenant>>('/tenants', tenantData);
  return response.data.data;
};

// Update an existing tenant
export const updateTenant = async (id: string, tenantData: TenantUpdate): Promise<Tenant> => {
  const response = await apiClient.put<ApiResponse<Tenant>>(`/tenants/${id}`, tenantData);
  return response.data.data;
};

// Delete a tenant
export const deleteTenant = async (id: string): Promise<boolean> => {
  const response = await apiClient.delete(`/tenants/${id}`);
  return response.status === 200;
};

// Upload tenant document
export const uploadTenantDocument = async (
  tenantId: string, 
  documentName: string, 
  documentUrl: string, 
  documentType: string
): Promise<Tenant> => {
  const formData = new FormData();
  formData.append('document_name', documentName);
  formData.append('document_url', documentUrl);
  formData.append('document_type', documentType);
  
  const response = await apiClient.post<ApiResponse<Tenant>>(
    `/tenants/${tenantId}/documents`, 
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  
  return response.data.data;
};

// Invite a tenant
export const inviteTenant = async (invitationData: TenantInvitationCreate): Promise<TenantInvitation> => {
  const response = await apiClient.post<ApiResponse<TenantInvitation>>('/invitations', invitationData);
  return response.data.data;
};

// Verify a tenant invitation
export const verifyInvitation = async (token: string): Promise<TenantInvitation> => {
  const response = await apiClient.get<ApiResponse<TenantInvitation>>(`/invitations/verify/${token}`);
  return response.data.data;
};

// Accept a tenant invitation
export const acceptInvitation = async (token: string, userId: string): Promise<TenantInvitation> => {
  const response = await apiClient.post<ApiResponse<TenantInvitation>>(`/invitations/accept/${token}`, { user_id: userId });
  return response.data.data;
}; 