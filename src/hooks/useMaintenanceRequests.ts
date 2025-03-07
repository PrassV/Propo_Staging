```typescript
import { useState, useEffect } from 'react';
import { getMaintenanceRequests } from '../utils/maintenance';
import { MaintenanceRequest } from '../types/maintenance';

export function useMaintenanceRequests(propertyId?: string) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    const result = await getMaintenanceRequests(propertyId);
    if (result.success) {
      setRequests(result.data);
      setError(null);
    } else {
      setError(result.error?.message || 'Failed to fetch requests');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [propertyId]);

  return { requests, loading, error, refetch: fetchRequests };
}
```