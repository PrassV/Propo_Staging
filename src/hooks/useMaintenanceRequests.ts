import { useState, useEffect } from 'react';
import { getMaintenanceRequests } from '../utils/maintenance';
import { MaintenanceRequest } from '../types/maintenance';

export function useMaintenanceRequests(propertyId?: string) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const result = await getMaintenanceRequests(propertyId ? { property_id: propertyId } : undefined);
      if (result.success && result.data) {
        setRequests(result.data.items || []);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch requests');
      }
    } catch (err) {
      setError('Failed to fetch requests');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [propertyId]);

  return { requests, loading, error, refetch: fetchRequests };
}