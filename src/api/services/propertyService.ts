import apiClient from '../client';
// Import PropertiesListResponse and remove ApiResponse if no longer needed elsewhere
import { Property, PropertyCreate, PropertyUpdate, PropertiesListResponse } from '../types';

// Get all properties - Assume backend returns PropertiesListResponse
export const getProperties = async (): Promise<PropertiesListResponse> => {
  const response = await apiClient.get<PropertiesListResponse>('/properties');
  // Return the whole response object { items: Property[], total: number }
  return response.data; 
};

// Get a single property by ID - Assume backend returns Property directly
export const getPropertyById = async (id: string): Promise<Property> => {
  const response = await apiClient.get<Property>(`/properties/${id}`);
  // Return the property object directly
  return response.data; 
};

// Create a new property - Assume backend returns the created Property directly
export const createProperty = async (propertyData: PropertyCreate): Promise<Property> => {
  const response = await apiClient.post<Property>('/properties', propertyData);
  // Return the created property object directly
  return response.data; 
};

// Update an existing property - Assume backend returns the updated Property directly
export const updateProperty = async (id: string, propertyData: PropertyUpdate): Promise<Property> => {
  const response = await apiClient.put<Property>(`/properties/${id}`, propertyData);
  // Return the updated property object directly
  return response.data; 
};

// Delete a property - Assume backend returns 204 No Content on success
export const deleteProperty = async (id: string): Promise<void> => {
  // Use status code 204 for success indication, no need to return boolean
  await apiClient.delete(`/properties/${id}`); 
};

/* 
// TODO: Uncomment and adjust when backend image upload endpoint is confirmed/created.
// The endpoint '/properties/{propertyId}/images' does not seem to exist in the current backend API.
// Verify the correct endpoint and data format (e.g., direct upload or passing URL).

// Upload property image 
export const uploadPropertyImage = async (propertyId: string, imageUrl: string, isPrimary: boolean = false): Promise<Property> => {
  const formData = new FormData();
  formData.append('image_url', imageUrl);
  formData.append('is_primary', isPrimary.toString());
  
  const response = await apiClient.post<Property>( // Use the correct response type from backend
    `/properties/${propertyId}/images`, // Use the correct backend endpoint
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  
  return response.data; // Adjust based on actual backend response structure
}; 
*/ 