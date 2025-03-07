import { useState, useEffect } from 'react';
import { getVendors } from '../services/vendorService';
import { Vendor, MaintenanceCategory } from '../types/maintenance';

export function useVendors(category?: MaintenanceCategory) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVendors = async () => {
    setLoading(true);
    const result = await getVendors(category);
    if (result.success) {
      setVendors(result.data);
      setError(null);
    } else {
      setError(result.error?.message || 'Failed to fetch vendors');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVendors();
  }, [category]);

  return { vendors, loading, error, refetch: fetchVendors };
}