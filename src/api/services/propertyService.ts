import apiClient from '../client';
// Import PropertiesListResponse and remove ApiResponse if no longer needed elsewhere
import { Property, PropertyCreate, PropertyUpdate, PropertiesListResponse, PropertyDetails, UnitDetails, UnitCreate, UnitResponse, PropertyTax, PropertyTaxCreate, TenantAssignment, PropertyLeaseDetailResponse } from '../types';
import axios from 'axios';

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
    const endpointPath = '/properties/'; // Added trailing slash for testing
    try {
        // Log the URL being requested
        const requestUrl = apiClient.getUri({ url: endpointPath, params });
        console.log(`[propertyService.getProperties] Requesting URL: ${requestUrl}`);

        const response = await apiClient.get<PropertiesListResponse>(endpointPath, { params }); // Use endpointPath
        console.log(`[propertyService.getProperties] Response status: ${response.status}`);
        return response.data;
    } catch (error: unknown) {
        // Log the error object for more details
        console.error(`[propertyService.getProperties] Error fetching properties from ${endpointPath}:`, error);

        let errorMessage = 'Failed to fetch properties';
        // Extract error message more robustly
        if (axios.isAxiosError(error)) {
            errorMessage = error.response?.data?.detail || error.message;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null && 'formattedMessage' in error) {
            errorMessage = (error as { formattedMessage: string }).formattedMessage;
        }
        console.error(`[propertyService.getProperties] Formatted Error: ${errorMessage}`);
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
        const response = await apiClient.post<Property>('/properties/', data);
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

/**
 * Fetches units for a specific property.
 * Calls GET /units with property_id parameter
 */
export const getUnitsForProperty = async (propertyId: string): Promise<UnitDetails[]> => {
    if (!propertyId) {
        return [];
    }

    try {
        const response = await apiClient.get<UnitDetails[]>('/units', {
            params: { property_id: propertyId }
        });
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
 * Calls POST /uploads endpoint and expects paths back.
 * Returns a promise resolving to an object containing the image paths.
 */
export const uploadPropertyImages = async (images: File[]): Promise<{ imagePaths: string[] }> => {
    if (!images || images.length === 0) {
        console.warn("uploadPropertyImages called with no images.");
        return { imagePaths: [] };
    }

    console.log(`Uploading ${images.length} image(s)...`);

    try {
        const formData = new FormData();
        images.forEach((file) => {
            formData.append('files', file);
        });
        formData.append('context', 'property_image');

        // Expecting { file_paths: List[str] } from the backend
        const response = await apiClient.post<{ file_paths: string[] }>('/uploads/', formData);

        // Check if response.data and file_paths exist and is an array
        if (response.data && Array.isArray(response.data.file_paths)) {
            // Return the paths with the new key
            return { imagePaths: response.data.file_paths };
        } else {
            console.error("Upload API response missing file_paths array:", response.data);
            throw new Error("Upload succeeded but API response did not contain the file paths array.");
        }

    } catch (error: unknown) {
        console.error("Error uploading property images:", error);
        let errorMessage = 'Failed to upload image(s)';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (axios.isAxiosError(error) && error.response?.data && typeof error.response.data === 'object' && 'detail' in error.response.data) {
            errorMessage = error.response.data.detail as string;
        }
        throw new Error(errorMessage);
    }
};

/**
 * Create a unit for a property
 * Calls POST /units with property_id in the request body
 */
export const createUnit = async (propertyId: string, unitData: UnitCreate): Promise<UnitResponse> => {
    try {
        const response = await apiClient.post<UnitResponse>('/units', {
            ...unitData,
            property_id: propertyId
        });
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

/**
 * Get images for a property
 * Calls GET /uploads/property/{id}/images
 */
export const getPropertyImages = async (propertyId: string): Promise<string[]> => {
    try {
        const response = await apiClient.get<string[]>(`/uploads/property/${propertyId}/images`);
        return response.data;
    } catch (error: unknown) {
        console.error(`Error fetching images for property ${propertyId}:`, error);
        let errorMessage = 'Failed to fetch property images';
        if (error && typeof error === 'object' && 'formattedMessage' in error) {
            errorMessage = (error as { formattedMessage: string }).formattedMessage;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
    }
};

/**
 * Get all units
 * Calls GET /units
 */
export const getUnits = async (): Promise<UnitDetails[]> => {
    try {
        const response = await apiClient.get<UnitDetails[]>('/units');
        return response.data;
    } catch (error: unknown) {
        console.error('Error fetching units:', error);
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
 * Get tax payment records for a property
 * Calls GET /properties/{propertyId}/taxes
 */
export const getPropertyTaxes = async (propertyId: string): Promise<PropertyTax[]> => {
  try {
    const response = await apiClient.get<PropertyTax[]>(`/properties/${propertyId}/taxes`);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error fetching taxes for property ${propertyId}:`, error);
    let errorMessage = 'Failed to fetch property taxes';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Create a new tax payment record for a property
 * Calls POST /properties/{propertyId}/taxes
 */
export const createPropertyTax = async (propertyId: string, taxData: PropertyTaxCreate): Promise<PropertyTax> => {
  try {
    const response = await apiClient.post<PropertyTax>(`/properties/${propertyId}/taxes`, taxData);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error creating tax record for property ${propertyId}:`, error);
    let errorMessage = 'Failed to create tax record';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Get images for a specific unit
 * Calls GET /properties/units/{unitId}/images
 */
export const getUnitImages = async (unitId: string): Promise<string[]> => {
  try {
    const response = await apiClient.get<string[]>(`/properties/units/${unitId}/images`);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error fetching images for unit ${unitId}:`, error);
    let errorMessage = 'Failed to fetch unit images';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Add an image to a unit
 * Calls POST /properties/units/{unitId}/images
 */
export const addUnitImage = async (unitId: string, imageUrl: string): Promise<string[]> => {
  try {
    const response = await apiClient.post<string[]>(`/properties/units/${unitId}/images`, { image_url: imageUrl });
    return response.data;
  } catch (error: unknown) {
    console.error(`Error adding image to unit ${unitId}:`, error);
    let errorMessage = 'Failed to add unit image';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Delete an image from a unit
 * Calls DELETE /properties/units/{unitId}/images
 */
export const deleteUnitImage = async (unitId: string, imageUrl: string): Promise<void> => {
  try {
    await apiClient.delete(`/properties/units/${unitId}/images`, { 
      data: { image_url: imageUrl }
    });
  } catch (error: unknown) {
    console.error(`Error deleting image from unit ${unitId}:`, error);
    let errorMessage = 'Failed to delete unit image';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Assign a tenant to a unit
 * Calls POST /units/{unitId}/tenants
 */
export const assignTenantToUnit = async (
  unitId: string, 
  assignmentData: {
    tenant_id: string;
    lease_start: string;
    lease_end?: string | null;
    rent_amount?: number;
    deposit_amount?: number | null;
    notes?: string;
  }
): Promise<TenantAssignment> => {
  try {
    const response = await apiClient.post<TenantAssignment>(`/units/${unitId}/tenants`, assignmentData);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error assigning tenant to unit ${unitId}:`, error);
    let errorMessage = 'Failed to assign tenant to unit';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

export const terminateLease = async (unitId: string, terminationDate: string): Promise<{ message: string }> => {
  try {
    const response = await apiClient.post<{ message: string }>(`/units/${unitId}/terminate_lease`, {
      termination_date: terminationDate,
    });
    return response.data;
  } catch (error: unknown) {
    console.error(`Error terminating lease for unit ${unitId}:`, error);
    let errorMessage = 'Failed to terminate lease';
    if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.detail || error.message;
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Get details for a single unit
 * Calls GET /units/{unit_id}
 */
export const getUnitDetails = async (unitId: string): Promise<UnitDetails> => {
  try {
    const response = await apiClient.get<UnitDetails>(`/units/${unitId}`);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error fetching unit details for ${unitId}:`, error);
    let errorMessage = 'Failed to fetch unit details';
    if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.detail || error.message;
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Phase 3: Get a single property with full lease-centric details.
 * Calls GET /properties/{id}/details
 */
export const getPropertyDetails = async (id: string): Promise<PropertyLeaseDetailResponse> => {
    try {
        const response = await apiClient.get<PropertyLeaseDetailResponse>(`/properties/${id}/details`);
        return response.data;
    } catch (error: unknown) {
        console.error(`Error fetching lease-centric details for property ${id}:`, error);
        let errorMessage = 'Failed to fetch property lease details';
        if (axios.isAxiosError(error)) {
            errorMessage = error.response?.data?.detail || error.message;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
    }
};