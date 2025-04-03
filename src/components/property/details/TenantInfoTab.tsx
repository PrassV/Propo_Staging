import React, { useState, useEffect } from 'react';
import { Tenant } from '@/api/types';
import { api } from '@/api/apiClient'; // Use the actual api client
import LoadingSpinner from '@/components/common/LoadingSpinner';
// import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'; // Not used
import { Link } from 'react-router-dom';

interface TenantInfoTabProps {
  tenantId: string;
}

export default function TenantInfoTab({ tenantId }: TenantInfoTabProps) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenant = async () => {
      if (!tenantId) {
        setError('No Tenant ID provided.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Use the actual API call from tenantService
        const response = await api.tenant.getTenantById(tenantId);
        if (response && response.tenant) {
            setTenant(response.tenant);
        } else {
            // Handle case where response or tenant is missing
            throw new Error('Tenant data not found in API response.');
        }
      } catch (err) { // Capture error
        console.error("Error fetching tenant:", err);
        setError(err instanceof Error ? err.message : 'Failed to load tenant details.');
        setTenant(null); // Clear tenant data on error
      } finally {
        setLoading(false);
      }
    };
    fetchTenant();
  }, [tenantId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <p className="text-sm text-destructive">Error: {error}</p>;
  if (!tenant) return <p className="text-sm text-muted-foreground">Tenant details not available.</p>;

  return (
    <div className="space-y-2">
        <p><strong className="font-medium">Name:</strong> {tenant.name}</p>
        <p><strong className="font-medium">Email:</strong> {tenant.email}</p>
        <p><strong className="font-medium">Phone:</strong> {tenant.phone || 'N/A'}</p>
        {/* Add more tenant details as needed */}
        <Link 
            to={`/tenants/${tenant.id}`} 
            className="text-sm text-primary hover:underline mt-2 inline-block"
        >
            View Full Tenant Details
        </Link>
    </div>
  );
} 