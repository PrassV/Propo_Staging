import apiClient from '../client';
// Import types from the central types file
import { 
  MaintenanceRequest, 
  MaintenanceRequestCreate, 
  MaintenanceRequestUpdate 
} from '../types';

// Get all maintenance requests - Assume backend returns MaintenanceRequest[] directly
export const getMaintenanceRequests = async (
  filters?: {
    property_id?: string;
    tenant_id?: string;
    status?: string;
    priority?: string;
  }
): Promise<MaintenanceRequest[]> => {
  const response = await apiClient.get<MaintenanceRequest[]>('/maintenance', { params: filters });
  // Return the array directly
  return response.data;
};

// Get a single maintenance request by ID - Assume backend returns MaintenanceRequest directly
export const getMaintenanceRequestById = async (id: string): Promise<MaintenanceRequest> => {
  const response = await apiClient.get<MaintenanceRequest>(`/maintenance/${id}`);
  // Return the object directly
  return response.data;
};

// Create a new maintenance request - Assume backend returns the created MaintenanceRequest directly
export const createMaintenanceRequest = async (requestData: MaintenanceRequestCreate): Promise<MaintenanceRequest> => {
  const response = await apiClient.post<MaintenanceRequest>('/maintenance', requestData);
  // Return the created object directly
  return response.data;
};

// Update an existing maintenance request - Assume backend returns the updated MaintenanceRequest directly
export const updateMaintenanceRequest = async (
  id: string,
  requestData: MaintenanceRequestUpdate
): Promise<MaintenanceRequest> => {
  const response = await apiClient.put<MaintenanceRequest>(`/maintenance/${id}`, requestData);
  // Return the updated object directly
  return response.data;
};

// Delete a maintenance request - Backend returns 200 OK with message (not 204)
export const deleteMaintenanceRequest = async (id: string): Promise<void> => {
  // Backend returns { message: "..." } on success, but we don't need it here yet.
  await apiClient.delete(`/maintenance/${id}`);
  // No return value needed for now.
};

/*
// TODO: Rework image handling for maintenance requests.
// Frontend tries to upload files directly, but backend endpoint POST /maintenance/{id}/images 
// expects a form with `image_url` and `description` strings (for linking, not uploading).
// Frontend should first upload the image (e.g., to Supabase storage), get the URL,
// then call the backend endpoint with the URL.

// Upload images for a maintenance request
export const uploadMaintenanceImages = async (
  requestId: string,
  images: File[] // This needs to change to handle URLs
): Promise<MaintenanceRequest> => {
  // Logic to upload each file in `images` to storage first...
  // const imageUrls = await uploadFilesToStorage(images);

  // Then call the backend endpoint for each URL (or modify backend to accept multiple URLs)
  // Example for one image URL:
  const formData = new FormData();
  // formData.append('image_url', imageUrls[0]);
  // formData.append('description', 'Optional description'); // Add description if needed

  const response = await apiClient.post<MaintenanceRequest>(
    `/maintenance/${requestId}/images`,
    formData,
    {
      // Headers might need to be 'application/x-www-form-urlencoded' or 'application/json' 
      // depending on how the backend expects the form data (FastAPI often parses form data without this header).
      // 'Content-Type': 'multipart/form-data' is likely incorrect if not uploading a file directly.
    }
  );

  return response.data;
};
*/

// Assign a maintenance request to a vendor - Send vendor_id as query param
export const assignMaintenanceRequest = async (
  requestId: string,
  vendorId: string
): Promise<MaintenanceRequest> => {
  const response = await apiClient.post<MaintenanceRequest>(
    `/maintenance/${requestId}/assign`, 
    null, // No request body
    { params: { vendor_id: vendorId } } // Send vendor_id as query parameter
  );
  
  // Return the updated request object directly
  return response.data;
};

/**
 * Get count of open maintenance requests for a tenant by calling the backend.
 */
export const getOpenTenantRequestsCount = async (tenantId: string): Promise<number> => {
    // console.warn(`getOpenTenantRequestsCount for ${tenantId} called - using mock data`);
    // TODO: Ensure backend endpoint like GET /maintenance/requests/count?tenant_id=...&status=open exists
    // TODO: Adjust endpoint and parameters as needed based on backend implementation.
    try {
        // Assuming endpoint returns an object like { count: number }
        const response = await apiClient.get<{ count: number }>('/maintenance/requests/count', { 
            params: { 
                tenant_id: tenantId, 
                // Backend uses 'new' instead of 'open'
                status: 'new' // This matches the backend's status value
            } 
        });
        return response.data.count ?? 0;
    } catch (error: unknown) {
        console.error(`Error fetching open requests count for tenant ${tenantId}:`, error);
        // Return 0 or rethrow
        // throw error;
        return 0; // Return 0 for now on error
    }
};

/**
 * Get open maintenance requests for a tenant (if needed for a list, not just count)
 * Placeholder - implement actual logic.
 */
// export const getOpenTenantRequests = async (tenantId: string): Promise<MaintenanceRequest[]> => {
//     // TODO: Implement query
//     return [];
// }; 