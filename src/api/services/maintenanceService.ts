import apiClient from '../client';
import { ApiResponse } from '../types';

// Define maintenance request types
export interface MaintenanceRequest {
  id: string;
  property_id: string;
  tenant_id?: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'emergency';
  category: string;
  images?: string[];
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRequestCreate {
  property_id: string;
  tenant_id?: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  category: string;
  images?: string[];
}

export interface MaintenanceRequestUpdate {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'emergency';
  category?: string;
  images?: string[];
  assigned_to?: string;
}

// Get all maintenance requests with optional filters
export const getMaintenanceRequests = async (
  filters?: {
    property_id?: string;
    tenant_id?: string;
    status?: string;
    priority?: string;
  }
): Promise<MaintenanceRequest[]> => {
  const response = await apiClient.get<ApiResponse<MaintenanceRequest[]>>('/maintenance', { params: filters });
  return response.data.data;
};

// Get a single maintenance request by ID
export const getMaintenanceRequestById = async (id: string): Promise<MaintenanceRequest> => {
  const response = await apiClient.get<ApiResponse<MaintenanceRequest>>(`/maintenance/${id}`);
  return response.data.data;
};

// Create a new maintenance request
export const createMaintenanceRequest = async (requestData: MaintenanceRequestCreate): Promise<MaintenanceRequest> => {
  const response = await apiClient.post<ApiResponse<MaintenanceRequest>>('/maintenance', requestData);
  return response.data.data;
};

// Update an existing maintenance request
export const updateMaintenanceRequest = async (
  id: string,
  requestData: MaintenanceRequestUpdate
): Promise<MaintenanceRequest> => {
  const response = await apiClient.put<ApiResponse<MaintenanceRequest>>(`/maintenance/${id}`, requestData);
  return response.data.data;
};

// Delete a maintenance request
export const deleteMaintenanceRequest = async (id: string): Promise<boolean> => {
  const response = await apiClient.delete(`/maintenance/${id}`);
  return response.status === 200;
};

// Upload images for a maintenance request
export const uploadMaintenanceImages = async (
  requestId: string,
  images: File[]
): Promise<MaintenanceRequest> => {
  const formData = new FormData();
  
  images.forEach((image, index) => {
    formData.append(`image_${index}`, image);
  });
  
  const response = await apiClient.post<ApiResponse<MaintenanceRequest>>(
    `/maintenance/${requestId}/images`, 
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  
  return response.data.data;
};

// Assign a maintenance request to a vendor
export const assignMaintenanceRequest = async (
  requestId: string,
  vendorId: string
): Promise<MaintenanceRequest> => {
  const response = await apiClient.post<ApiResponse<MaintenanceRequest>>(
    `/maintenance/${requestId}/assign`,
    { vendor_id: vendorId }
  );
  
  return response.data.data;
}; 