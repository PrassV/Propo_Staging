import apiClient from '../client';
// Import PropertiesListResponse and remove ApiResponse if no longer needed elsewhere
import { Property, PropertyCreate, PropertyUpdate, PropertiesListResponse, PropertyDetails, UnitDetails, UnitCreate, UnitResponse } from '../types';

// Define Unit type (adjust based on actual API response)
export interface PropertyUnit {
    id: string;
    property_id: string;
    unit_number: string;
    // Add other relevant unit fields (e.g., beds, baths, sqft)
}

/**
 * Get all properties with optional filtering and pagination
 * Calls GET /properties
 */
export const getProperties = async (
    params?: {
        sort_by?: string;
        sort_order?: 'asc' | 'desc';
        property_type?: string;
        city?: string;
        pincode?: string;
        skip?: number;
        limit?: number;
    }
): Promise<PropertiesListResponse> => {
    try {
        const response = await apiClient.get<PropertiesListResponse>('/properties', { params });
        return response.data;
    } catch (error: unknown) {
        console.error("Error fetching properties:", error);
        let errorMessage = 'Failed to fetch properties';
        if (error && typeof error === 'object' && 'formattedMessage' in error) {
            errorMessage = (error as { formattedMessage: string }).formattedMessage;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
    }
};

/**
 * Get a single property by ID with detailed information
 * Calls GET /properties/{id}
 */
export const getPropertyById = async (id: string): Promise<PropertyDetails> => {
    try {
        const response = await apiClient.get<PropertyDetails>(`/properties/${id}`);
        return response.data;
    } catch (error: unknown) {
        console.error(`Error fetching property ${id}:`, error);
        let errorMessage = 'Failed to fetch property details';
        if (error && typeof error === 'object' && 'formattedMessage' in error) {
            errorMessage = (error as { formattedMessage: string }).formattedMessage;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
    }
};

/**
 * Create a new property
 * Calls POST /properties
 */
export const createProperty = async (data: PropertyCreate): Promise<Property> => {
    try {
        const response = await apiClient.post<Property>('/properties', data);
        return response.data;
    } catch (error: unknown) {
        console.error("Error creating property:", error);
        let errorMessage = 'Failed to create property';
        if (error && typeof error === 'object' && 'formattedMessage' in error) {
            errorMessage = (error as { formattedMessage: string }).formattedMessage;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
    }
};

/**
 * Update an existing property
 * Calls PUT /properties/{id}
 */
export const updateProperty = async (id: string, data: PropertyUpdate): Promise<Property> => {
    try {
        const response = await apiClient.put<Property>(`/properties/${id}`, data);
        return response.data;
    } catch (error: unknown) {
        console.error(`Error updating property ${id}:`, error);
        let errorMessage = 'Failed to update property';
        if (error && typeof error === 'object' && 'formattedMessage' in error) {
            errorMessage = (error as { formattedMessage: string }).formattedMessage;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
    }
};

/**
 * Delete a property
 * Calls DELETE /properties/{id}
 */
export const deleteProperty = async (id: string): Promise<void> => {
    try {
        await apiClient.delete(`/properties/${id}`);
    } catch (error: unknown) {
        console.error(`Error deleting property ${id}:`, error);
        let errorMessage = 'Failed to delete property';
        if (error && typeof error === 'object' && 'formattedMessage' in error) {
            errorMessage = (error as { formattedMessage: string }).formattedMessage;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
    }
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

/**
 * Fetches units for a specific property.
 * Calls GET /properties/{propertyId}/units
 */
export const getUnitsForProperty = async (propertyId: string): Promise<UnitDetails[]> => {
    if (!propertyId) {
        return [];
    }
    
    try {
        const response = await apiClient.get<UnitDetails[]>(`/properties/${propertyId}/units`);
        return response.data || [];
    } catch (error: unknown) {
        console.error(`Error fetching units for property ${propertyId}:`, error);
        let errorMessage = 'Failed to fetch units';
        if (error && typeof error === 'object' && 'formattedMessage' in error) {
            errorMessage = (error as { formattedMessage: string }).formattedMessage;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
    }
}; 

/**
 * Upload property images
 * Calls POST /upload endpoint for image files
 */
export const uploadPropertyImages = async (images: File[]): Promise<{ imageUrls: string[] }> => {
    try {
        const formData = new FormData();
        images.forEach((file, index) => {
            formData.append(`file${index}`, file);
        });
        
        const response = await apiClient.post<{ imageUrls: string[] }>('/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        
        return response.data;
    } catch (error: unknown) {
        console.error("Error uploading property images:", error);
        let errorMessage = 'Failed to upload images';
        if (error && typeof error === 'object' && 'formattedMessage' in error) {
            errorMessage = (error as { formattedMessage: string }).formattedMessage;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
    }
}; 

/**
 * Create a unit for a property
 * Calls POST /properties/{propertyId}/units
 */
export const createUnit = async (propertyId: string, unitData: UnitCreate): Promise<UnitResponse> => {
    try {
        const response = await apiClient.post<UnitResponse>(`/properties/${propertyId}/units`, unitData);
        return response.data;
    } catch (error: unknown) {
        console.error(`Error creating unit for property ${propertyId}:`, error);
        let errorMessage = 'Failed to create unit';
        if (error && typeof error === 'object' && 'formattedMessage' in error) {
            errorMessage = (error as { formattedMessage: string }).formattedMessage;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
    }
}; 