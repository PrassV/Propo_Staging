// Remove Supabase import
// import { supabase } from '../lib/supabase';

// Import only needed types and service functions
import { MaintenanceRequestCreate, MaintenanceRequestUpdate } from '../api/types'; 
import { 
    getMaintenanceRequests as getRequestsFromService, 
    createMaintenanceRequest as createRequestInService, 
    updateMaintenanceRequest as updateRequestInService 
} from '../api/services/maintenanceService';
import toast from 'react-hot-toast';

// Refactored getMaintenanceRequests
// Note: The original function fetched properties first based on auth user,
// the backend service GET /maintenance likely handles auth implicitly.
// We pass filters directly to the service.
export async function getMaintenanceRequests(filters?: { property_id?: string }) {
  try {
    // Call the refactored service function which uses apiClient
    const data = await getRequestsFromService(filters);
    // Service function returns MaintenanceRequest[] directly
    return { success: true, data };
  } catch (error: unknown) {
    console.error('Error fetching maintenance requests:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch requests';
    toast.error(message);
    // Return error structure compatible with original usage if needed, or just rethrow
    return { success: false, error: message };
  }
}

// Refactored createMaintenanceRequest
// Utility now expects MaintenanceRequestCreate type, matching the service/API
export async function createMaintenanceRequest(data: MaintenanceRequestCreate) {
  try {
    // Call the refactored service function which uses apiClient
    const request = await createRequestInService(data);
    // Service returns the created MaintenanceRequest
    return { success: true, data: request };
  } catch (error: unknown) {
    console.error('Error creating maintenance request:', error);
    const message = error instanceof Error ? error.message : 'Failed to create request';
    toast.error(message);
    return { success: false, error: message };
  }
}

// Refactored updateMaintenanceRequest
// Utility now expects MaintenanceRequestUpdate type, matching the service/API
export async function updateMaintenanceRequest(id: string, data: MaintenanceRequestUpdate) {
  try {
    // Call the refactored service function which uses apiClient
    await updateRequestInService(id, data);
    // Service PUT returns updated request, but original util just returned success
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating maintenance request:', error);
    const message = error instanceof Error ? error.message : 'Failed to update request';
    toast.error(message);
    return { success: false, error: message };
  }
}