import { apiFetch } from './api';
import { MaintenanceRequest } from '../types/maintenance';
import toast from 'react-hot-toast';

export async function getMaintenanceRequests(propertyId?: string) {
  try {
    // Use propertyId as a query parameter if provided
    const endpoint = propertyId 
      ? `maintenance/requests?property_id=${propertyId}` 
      : 'maintenance/requests';
    
    const response = await apiFetch(endpoint);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to fetch maintenance requests');
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching maintenance requests:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to fetch requests');
    return { success: false, error };
  }
}

export async function createMaintenanceRequest(data: Partial<MaintenanceRequest>) {
  try {
    const response = await apiFetch('maintenance/requests', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to create maintenance request');
    }
    
    const requestData = await response.json();
    return { success: true, data: requestData };
  } catch (error) {
    console.error('Error creating maintenance request:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to create request');
    return { success: false, error };
  }
}

export async function updateMaintenanceRequest(id: string, data: Partial<MaintenanceRequest>) {
  try {
    const response = await apiFetch(`maintenance/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to update maintenance request');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating maintenance request:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to update request');
    return { success: false, error };
  }
}