import apiClient from '../client';
import { 
  Vendor, VendorCreate, VendorUpdate 
} from '../types';

// Interface for query parameters for getVendors
interface GetVendorsParams {
  status?: string;
  category?: string;
}

interface VendorsListResponse {
  items: Vendor[];
  total: number;
}

export const getVendors = async (params: GetVendorsParams = {}): Promise<Vendor[]> => {
  const response = await apiClient.get<VendorsListResponse>('/vendors/', { params });
  return response.data.items;
};

export const getVendorById = async (id: string): Promise<Vendor> => {
  const response = await apiClient.get<Vendor>(`/vendors/${id}`);
  return response.data;
};

export const createVendor = async (vendorData: VendorCreate): Promise<Vendor> => {
  const response = await apiClient.post<Vendor>('/vendors/', vendorData);
  return response.data;
};

export const updateVendor = async (id: string, vendorData: VendorUpdate): Promise<Vendor> => {
  const response = await apiClient.put<Vendor>(`/vendors/${id}`, vendorData);
  return response.data;
};

export const deleteVendor = async (id: string): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(`/vendors/${id}`);
  return response.data;
};

export const searchVendors = async (query: string, category?: string): Promise<Vendor[]> => {
  const params: { query: string; category?: string } = { query };
  if (category) params.category = category;
  const response = await apiClient.get<Vendor[]>('/vendors/search', { params });
  return response.data;
};

export const updateVendorRating = async (id: string, rating: number): Promise<Vendor> => {
  const params = { rating };
  const response = await apiClient.put<Vendor>(`/vendors/${id}/rating`, null, { params });
  return response.data;
};

// Define specific type for jobs if known, otherwise use unknown[] or any[]
export const getVendorJobs = async (id: string): Promise<unknown[]> => {
  const response = await apiClient.get<unknown[]>(`/vendors/${id}/jobs`);
  return response.data;
};

export const incrementCompletedJobs = async (id: string): Promise<Vendor> => {
  const response = await apiClient.post<Vendor>(`/vendors/${id}/completed-jobs`);
  return response.data;
};

// Define specific type for stats if known
export const getVendorStatistics = async (): Promise<Record<string, unknown>> => {
  const response = await apiClient.get<Record<string, unknown>>('/vendors/statistics');
  return response.data;
}; 