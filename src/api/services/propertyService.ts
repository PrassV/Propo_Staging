import apiClient from '../client';
import { ApiResponse, Property, PropertyCreate, PropertyUpdate } from '../types';

// Get all properties
export const getProperties = async (): Promise<Property[]> => {
  const response = await apiClient.get<ApiResponse<Property[]>>('/properties');
  return response.data.data;
};

// Get a single property by ID
export const getPropertyById = async (id: string): Promise<Property> => {
  const response = await apiClient.get<ApiResponse<Property>>(`/properties/${id}`);
  return response.data.data;
};

// Create a new property
export const createProperty = async (propertyData: PropertyCreate): Promise<Property> => {
  const response = await apiClient.post<ApiResponse<Property>>('/properties', propertyData);
  return response.data.data;
};

// Update an existing property
export const updateProperty = async (id: string, propertyData: PropertyUpdate): Promise<Property> => {
  const response = await apiClient.put<ApiResponse<Property>>(`/properties/${id}`, propertyData);
  return response.data.data;
};

// Delete a property
export const deleteProperty = async (id: string): Promise<boolean> => {
  const response = await apiClient.delete(`/properties/${id}`);
  return response.status === 200;
};

// Upload property image
export const uploadPropertyImage = async (propertyId: string, imageUrl: string, isPrimary: boolean = false): Promise<Property> => {
  const formData = new FormData();
  formData.append('image_url', imageUrl);
  formData.append('is_primary', isPrimary.toString());
  
  const response = await apiClient.post<ApiResponse<Property>>(
    `/properties/${propertyId}/images`, 
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  
  return response.data.data;
}; 