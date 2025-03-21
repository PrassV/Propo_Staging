import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import { 
  MaintenanceRequest, 
  MaintenanceRequestCreate, 
  MaintenanceRequestUpdate 
} from '../api/services/maintenanceService';

export function useMaintenanceApi(filters?: {
  property_id?: string;
  tenant_id?: string;
  status?: string;
  priority?: string;
}) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const requestsData = await api.maintenance.getMaintenanceRequests(filters);
      setRequests(requestsData);
    } catch (error: unknown) {
      console.error('Error fetching maintenance requests:', error);
      let errorMessage = 'Failed to fetch maintenance requests';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'formattedMessage' in error) {
        errorMessage = (error as { formattedMessage: string }).formattedMessage;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Create a new maintenance request
  const createRequest = async (requestData: MaintenanceRequestCreate) => {
    try {
      const createdRequest = await api.maintenance.createMaintenanceRequest(requestData);
      setRequests(prev => [...prev, createdRequest]);
      return { success: true, request: createdRequest };
    } catch (error: unknown) {
      console.error('Error creating maintenance request:', error);
      let errorMessage = 'Failed to create maintenance request';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'formattedMessage' in error) {
        errorMessage = (error as { formattedMessage: string }).formattedMessage;
      }
      return { success: false, error: errorMessage };
    }
  };

  // Update a maintenance request
  const updateRequest = async (id: string, requestData: MaintenanceRequestUpdate) => {
    try {
      const updatedRequest = await api.maintenance.updateMaintenanceRequest(id, requestData);
      setRequests(prev => prev.map(r => r.id === id ? updatedRequest : r));
      return { success: true, request: updatedRequest };
    } catch (error: unknown) {
      console.error('Error updating maintenance request:', error);
      let errorMessage = 'Failed to update maintenance request';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'formattedMessage' in error) {
        errorMessage = (error as { formattedMessage: string }).formattedMessage;
      }
      return { success: false, error: errorMessage };
    }
  };

  // Delete a maintenance request
  const deleteRequest = async (id: string) => {
    try {
      const success = await api.maintenance.deleteMaintenanceRequest(id);
      if (success) {
        setRequests(prev => prev.filter(r => r.id !== id));
      }
      return { success };
    } catch (error: unknown) {
      console.error('Error deleting maintenance request:', error);
      let errorMessage = 'Failed to delete maintenance request';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'formattedMessage' in error) {
        errorMessage = (error as { formattedMessage: string }).formattedMessage;
      }
      return { success: false, error: errorMessage };
    }
  };

  // Upload images for a maintenance request
  const uploadImages = async (requestId: string, images: File[]) => {
    try {
      const updatedRequest = await api.maintenance.uploadMaintenanceImages(requestId, images);
      setRequests(prev => prev.map(r => r.id === requestId ? updatedRequest : r));
      return { success: true, request: updatedRequest };
    } catch (error: unknown) {
      console.error('Error uploading images:', error);
      let errorMessage = 'Failed to upload images';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'formattedMessage' in error) {
        errorMessage = (error as { formattedMessage: string }).formattedMessage;
      }
      return { success: false, error: errorMessage };
    }
  };

  // Assign a maintenance request to a vendor
  const assignRequest = async (requestId: string, vendorId: string) => {
    try {
      const updatedRequest = await api.maintenance.assignMaintenanceRequest(requestId, vendorId);
      setRequests(prev => prev.map(r => r.id === requestId ? updatedRequest : r));
      return { success: true, request: updatedRequest };
    } catch (error: unknown) {
      console.error('Error assigning request:', error);
      let errorMessage = 'Failed to assign request';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'formattedMessage' in error) {
        errorMessage = (error as { formattedMessage: string }).formattedMessage;
      }
      return { success: false, error: errorMessage };
    }
  };

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user, JSON.stringify(filters)]);

  return {
    requests,
    loading,
    error,
    refetch: fetchRequests,
    createRequest,
    updateRequest,
    deleteRequest,
    uploadImages,
    assignRequest
  };
} 