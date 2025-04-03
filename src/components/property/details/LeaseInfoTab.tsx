import React, { useState, useEffect } from 'react';
import { LeaseAgreement } from '@/api/types';
import { api } from '@/api/apiClient'; // Use actual api client
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface LeaseInfoTabProps {
  unitId: string;
}

export default function LeaseInfoTab({ unitId }: LeaseInfoTabProps) {
  const [lease, setLease] = useState<LeaseAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLease = async () => {
      if (!unitId) return;
      setLoading(true); setError(null);
      try {
        // Use actual API call
        const data = await api.lease.getLeaseByUnitId(unitId); 
        setLease(data); // API service returns LeaseAgreement or null
      } catch (err) { 
        console.error("Error fetching lease:", err);
        setError(err instanceof Error ? err.message : 'Failed to load lease details.');
        setLease(null); // Clear lease on error
      } 
      finally { setLoading(false); }
    };
    fetchLease();
  }, [unitId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <p className="text-sm text-destructive">Error: {error}</p>;

  return (
    <div className="space-y-2">
      {lease ? (
          <>
            <p><strong className="font-medium">Status:</strong> <span className="capitalize">{lease.status}</span></p>
            <p><strong className="font-medium">Term:</strong> {new Date(lease.start_date).toLocaleDateString()} - {new Date(lease.end_date).toLocaleDateString()}</p>
            <p><strong className="font-medium">Rent:</strong> ${lease.rent_amount} / {lease.rent_frequency}</p>
            <p><strong className="font-medium">Deposit:</strong> ${lease.deposit_amount}</p>
            {lease.document_url && <a href={lease.document_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">View Full Agreement</a>}
            {/* TODO: Add Edit/Renew/Terminate Buttons */} 
          </>
      ) : (
          <p className="text-sm text-muted-foreground">No active lease found for this unit.</p>
          // TODO: Add 'Create Lease' Button
      )}
    </div>
  );
} 