import React, { useState, useEffect } from 'react';
import { Tenant } from '@/api/types';
import { getTenantById } from '@/api/services/tenantService'; // Import service function
import LoadingSpinner from '@/components/common/LoadingSpinner';
// import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'; // Not used
import { Link } from 'react-router-dom';

interface TenantInfoTabProps {
  tenantId: string;
  tenant?: Tenant | null;
}

export default function TenantInfoTab({ tenantId, tenant: propTenant }: TenantInfoTabProps) {
  const [tenant, setTenant] = useState<Tenant | null>(propTenant || null);
  const [loading, setLoading] = useState(!propTenant);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propTenant) {
      setTenant(propTenant);
      setLoading(false);
      setError(null);
      return;
    }
    const fetchTenant = async () => {
      if (!tenantId) {
        setError('No Tenant ID provided.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Use the imported service function
        const response = await getTenantById(tenantId);
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
  }, [tenantId, propTenant]);

  if (loading) return <LoadingSpinner />;
  if (error) return <p className="text-sm text-destructive">Error: {error}</p>;
  if (!tenant) return <p className="text-sm text-muted-foreground">Tenant details not available.</p>;

  return (
    <div className="space-y-4">
        {/* Primary Contact Information */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Contact Information</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="font-medium">{tenant.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium text-blue-600">{tenant.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Phone:</span>
              <span className="font-medium">{tenant.phone || 'Not provided'}</span>
            </div>
            {tenant.status && (
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium px-2 py-1 rounded text-xs ${
                  tenant.status === 'active' ? 'bg-green-100 text-green-800' :
                  tenant.status === 'unassigned' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {tenant.status?.charAt(0).toUpperCase()}{tenant.status?.slice(1)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Personal Information */}
        {(tenant.dob || tenant.gender || tenant.family_size) && (
          <div className="bg-gray-50 border rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Personal Details</h4>
            <div className="space-y-2">
              {tenant.dob && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Date of Birth:</span>
                  <span className="font-medium">{new Date(tenant.dob).toLocaleDateString()}</span>
                </div>
              )}
              {tenant.gender && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Gender:</span>
                  <span className="font-medium capitalize">{tenant.gender}</span>
                </div>
              )}
              {tenant.family_size && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Family Size:</span>
                  <span className="font-medium">{tenant.family_size} members</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rental Information */}
        {(tenant.rental_type || tenant.rental_amount || tenant.rent_frequency) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Rental Details</h4>
            <div className="space-y-2">
              {tenant.rental_type && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium capitalize">{tenant.rental_type}</span>
                </div>
              )}
              {tenant.rental_amount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium text-green-600">${tenant.rental_amount}</span>
                </div>
              )}
              {tenant.rent_frequency && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Frequency:</span>
                  <span className="font-medium capitalize">{tenant.rent_frequency}</span>
                </div>
              )}
              {tenant.rental_start_date && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Start Date:</span>
                  <span className="font-medium">{new Date(tenant.rental_start_date).toLocaleDateString()}</span>
                </div>
              )}
              {tenant.rental_end_date && (
                <div className="flex justify-between">
                  <span className="text-gray-600">End Date:</span>
                  <span className="font-medium">{new Date(tenant.rental_end_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Address Information */}
        {tenant.permanent_address && (
          <div className="bg-gray-50 border rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Address</h4>
            <p className="text-gray-700">{tenant.permanent_address}</p>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex space-x-3 pt-2">
          <Link 
              to={`/tenants/${tenant.id}`} 
              className="flex-1 text-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
              View Full Profile
          </Link>
          <button 
            className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
            onClick={() => window.open(`mailto:${tenant.email}`, '_blank')}
          >
            Send Email
          </button>
        </div>
    </div>
  );
} 