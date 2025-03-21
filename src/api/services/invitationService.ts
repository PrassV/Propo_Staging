import apiClient from '../client';
import { ApiResponse, TenantInvitation, TenantInvitationCreate } from '../types';

// Create a new tenant invitation
export const createInvitation = async (invitationData: TenantInvitationCreate): Promise<TenantInvitation> => {
  const response = await apiClient.post<ApiResponse<TenantInvitation>>('/invitations', invitationData);
  return response.data.data;
};

// Get all invitations
export const getInvitations = async (filters?: { property_id?: string; status?: string }): Promise<TenantInvitation[]> => {
  const response = await apiClient.get<ApiResponse<TenantInvitation[]>>('/invitations', { params: filters });
  return response.data.data;
};

// Get invitation by ID
export const getInvitationById = async (id: string): Promise<TenantInvitation> => {
  const response = await apiClient.get<ApiResponse<TenantInvitation>>(`/invitations/${id}`);
  return response.data.data;
};

// Verify invitation token
export const verifyInvitation = async (token: string): Promise<TenantInvitation> => {
  const response = await apiClient.get<ApiResponse<TenantInvitation>>(`/invitations/verify/${token}`);
  return response.data.data;
};

// Accept invitation
export const acceptInvitation = async (token: string, userData: { 
  user_id?: string; 
  email?: string; 
  password?: string; 
  first_name?: string; 
  last_name?: string;
}): Promise<TenantInvitation> => {
  const response = await apiClient.post<ApiResponse<TenantInvitation>>(
    `/invitations/accept/${token}`,
    userData
  );
  return response.data.data;
};

// Resend invitation
export const resendInvitation = async (invitationId: string): Promise<TenantInvitation> => {
  const response = await apiClient.post<ApiResponse<TenantInvitation>>(`/invitations/${invitationId}/resend`);
  return response.data.data;
};

// Cancel invitation
export const cancelInvitation = async (invitationId: string): Promise<boolean> => {
  const response = await apiClient.delete(`/invitations/${invitationId}`);
  return response.status === 200;
}; 