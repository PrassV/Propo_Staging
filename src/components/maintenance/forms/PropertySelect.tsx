import React, { useState, useEffect } from 'react';
import { FormControl, InputLabel, Select, MenuItem, CircularProgress, FormHelperText, SelectChangeEvent } from '@mui/material';
// Remove Supabase import
// import { supabase } from '../../../lib/supabase';
// Remove unused useAuth import as service handles auth implicitly
// import { useAuth } from '../../../contexts/AuthContext'; 

// Import service and type
import { getProperties } from '@/api/services/propertyService';
import { Property } from '@/api/types'; // Use the central type definition

// Remove local Property interface
/*
interface Property {
  id: string;
  property_name: string;
  address_line1: string;
  city: string;
}
*/

interface PropertySelectProps {
  value: string;
  // Use the correct MUI event type
  onChange: (event: SelectChangeEvent<string>) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
}

const PropertySelect: React.FC<PropertySelectProps> = ({ value, onChange, disabled, error, helperText }) => {
  // Remove user state, not needed for fetching
  // const { user } = useAuth(); 
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // Start loading true initially
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperties = async () => {
      // Removed user check
      setLoading(true);
      setFetchError(null);
      try {
        // Call the service function
        const response = await getProperties();
        // Set state from response.data.items
        setProperties(response.items || []);
      } catch (err: unknown) {
        console.error('Error fetching properties:', err);
        // Set error message
        setFetchError(err instanceof Error ? err.message : 'Failed to load properties.');
        setProperties([]); // Clear properties on error
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []); // Empty dependency array, fetch once on mount

  return (
    <FormControl fullWidth error={error || !!fetchError}>
      <InputLabel id="property-select-label">Property</InputLabel>
      <Select
        labelId="property-select-label"
        id="property-select"
        value={loading || fetchError ? '' : value} // Handle loading/error state
        label="Property"
        onChange={onChange}
        disabled={disabled || loading || !!fetchError}
        required // Keep required if needed
      >
        {/* Add Loading state */}
        {loading && (
          <MenuItem value="" disabled>
            <CircularProgress size={20} style={{ marginRight: '8px' }} />
            Loading properties...
          </MenuItem>
        )}
        {/* Add Error state */}
        {fetchError && (
          <MenuItem value="" disabled>
            Error loading properties
          </MenuItem>
        )}
        {/* Placeholder/No data state */}
        {!loading && !fetchError && properties.length === 0 && (
            <MenuItem value="" disabled>
                No properties found
            </MenuItem>
        )}
        {/* Property options */}
        {!loading && !fetchError && properties.map((property) => (
          <MenuItem key={property.id} value={property.id}>
            {property.property_name} - {property.address_line1}, {property.city}
          </MenuItem>
        ))}
      </Select>
       {/* Display helper text or fetch error */}
      {(helperText || fetchError) && (
        <FormHelperText error={!!fetchError}>{fetchError || helperText}</FormHelperText>
      )}
    </FormControl>
  );
};

export default PropertySelect;