import React, { useState, useEffect } from 'react';
import { FormControl, InputLabel, Select, MenuItem, CircularProgress, FormHelperText, SelectChangeEvent } from '@mui/material';
// Remove Supabase import
// import { supabase } from '../../../lib/supabase';

// Import service and type
import { getTenants } from '@/api/services/tenantService';
import { Tenant } from '@/api/types';

interface TenantSelectProps {
  propertyId: string | null | undefined;
  unitNumber?: string | null | undefined;
  value: string;
  onChange: (event: SelectChangeEvent<string>) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
}

const TenantSelect: React.FC<TenantSelectProps> = ({ 
    propertyId, 
    unitNumber, 
    value, 
    onChange, 
    disabled, 
    error,
    helperText
}) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState<boolean>(false); // Don't start loading initially
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenants = async () => {
      // Only fetch if propertyId is present
      if (!propertyId) {
        setTenants([]);
        setLoading(false);
        setFetchError(null);
        return;
      }

      setLoading(true);
      setFetchError(null);
      try {
        // Prepare filters, include unit_number only if it has a value
        const filters: { property_id: string; unit_number?: string } = { 
          property_id: propertyId 
        };
        if (unitNumber) {
          filters.unit_number = unitNumber;
        }
        
        // Call the service function with filters
        const response = await getTenants(filters);
        setTenants(response.items || []);
      } catch (err: unknown) {
        console.error('Error fetching tenants:', err);
        setFetchError(err instanceof Error ? err.message : 'Failed to load tenants.');
        setTenants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTenants();
  }, [propertyId, unitNumber]); // Re-fetch if property or unit changes

  return (
    <FormControl fullWidth error={error || !!fetchError}>
      <InputLabel id="tenant-select-label">Tenant</InputLabel>
      <Select
        labelId="tenant-select-label"
        id="tenant-select"
        value={loading || fetchError || !propertyId ? '' : value} // Clear selection if loading, error, or no property
        label="Tenant"
        onChange={onChange}
        disabled={disabled || loading || !!fetchError || !propertyId}
        required // Keep if necessary
      >
        {/* Handle Loading state */}
        {loading && (
          <MenuItem value="" disabled>
            <CircularProgress size={20} style={{ marginRight: '8px' }} />
            Loading tenants...
          </MenuItem>
        )}
        {/* Handle Error state */}
        {fetchError && (
          <MenuItem value="" disabled>
            Error loading tenants
          </MenuItem>
        )}
        {/* Handle No Property state */}
        {!loading && !fetchError && !propertyId && (
            <MenuItem value="" disabled>
                Select a property first
            </MenuItem>
        )}
        {/* Handle No Tenants Found state */}
        {!loading && !fetchError && tenants.length === 0 && propertyId && (
            <MenuItem value="" disabled>
                No tenants found for this selection
            </MenuItem>
        )}
        {/* Tenant options */}
        {!loading && !fetchError && propertyId && tenants.map((tenant) => (
          <MenuItem key={tenant.id} value={tenant.id}>
            {tenant.name} {tenant.email ? `(${tenant.email})` : ''}
          </MenuItem>
        ))}
      </Select>
      {(helperText || fetchError) && (
        <FormHelperText error={!!fetchError}>{fetchError || helperText}</FormHelperText>
      )}
    </FormControl>
  );
};

export default TenantSelect;