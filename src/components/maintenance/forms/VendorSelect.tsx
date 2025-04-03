import React, { useState, useEffect } from 'react';
import { FormControl, InputLabel, Select, MenuItem, CircularProgress, FormHelperText, SelectChangeEvent } from '@mui/material';
// Remove Supabase import
// import { supabase } from '../../../lib/supabase';

// Import service and types from api/ directory
import { getVendors } from '@/api/services/vendorService';
import { Vendor, MaintenanceCategory } from '@/api/types';

interface VendorSelectProps {
  category?: MaintenanceCategory | string | null | undefined; // Accept string from form or specific type
  value: string;
  onChange: (event: SelectChangeEvent<string>) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  label?: string; // Add optional label prop
  required?: boolean;
}

const VendorSelect: React.FC<VendorSelectProps> = ({ 
    category, 
    value, 
    onChange, 
    disabled, 
    error, 
    helperText,
    label = "Preferred Vendor (Optional)", // Default label
    required = false // Default required to false
}) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        // Prepare filters
        const filters: { category?: string } = {};
        if (category) {
          filters.category = category;
        }
        
        // Call the service function
        const fetchedVendors = await getVendors(filters);
        setVendors(fetchedVendors || []);
      } catch (err: unknown) {
        console.error('Error fetching vendors:', err);
        setFetchError(err instanceof Error ? err.message : 'Failed to load vendors.');
        setVendors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
    // Re-fetch when category changes
  }, [category]); 

  return (
    <FormControl fullWidth error={error || !!fetchError}>
      <InputLabel id="vendor-select-label">{label}</InputLabel>
      <Select
        labelId="vendor-select-label"
        id="vendor-select"
        value={loading || fetchError ? '' : value}
        label={label}
        onChange={onChange}
        disabled={disabled || loading || !!fetchError}
        required={required} 
      >
        {loading && (
          <MenuItem value="" disabled>
            <CircularProgress size={20} style={{ marginRight: '8px' }} />
            Loading vendors...
          </MenuItem>
        )}
        {fetchError && (
          <MenuItem value="" disabled>
            Error loading vendors
          </MenuItem>
        )}
        {/* Always show the placeholder option */}
        <MenuItem value="">{required ? "Select Vendor" : "Select Vendor (Optional)"}</MenuItem>
        
        {!loading && !fetchError && vendors.length === 0 && (
            <MenuItem value="" disabled>
                No vendors found{category ? ` for ${category}` : ''}
            </MenuItem>
        )}
        {!loading && !fetchError && vendors.map((vendor) => (
          <MenuItem key={vendor.id} value={vendor.id}>
            {/* Display name and maybe category/rating */}
            {vendor.company_name} {vendor.category ? `(${vendor.category})` : ''} 
          </MenuItem>
        ))}
      </Select>
      {(helperText || fetchError) && (
        <FormHelperText error={!!fetchError}>{fetchError || helperText}</FormHelperText>
      )}
    </FormControl>
  );
};

export default VendorSelect;