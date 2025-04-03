import React, { useState, useEffect } from 'react';
import { FormControl, InputLabel, Select, MenuItem, CircularProgress, FormHelperText, SelectChangeEvent } from '@mui/material';
import { getUnitsForProperty, PropertyUnit } from '@/api/services/propertyService';

interface UnitSelectProps {
  propertyId: string | null | undefined;
  value: string;
  onChange: (event: SelectChangeEvent<string>) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
}

const UnitSelect: React.FC<UnitSelectProps> = ({ propertyId, value, onChange, disabled, error, helperText }) => {
  const [units, setUnits] = useState<PropertyUnit[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUnits = async () => {
      if (!propertyId) {
        setUnits([]);
        setLoading(false);
        setFetchError(null);
        return;
      }

      setLoading(true);
      setFetchError(null);
      try {
        const fetchedUnits = await getUnitsForProperty(propertyId);
        const validUnits = fetchedUnits.filter(unit => unit.unit_number);
        const uniqueUnits = Array.from(new Map(validUnits.map(unit => [unit.unit_number, unit])).values());
        setUnits(uniqueUnits);
      } catch (err: unknown) {
        console.error('Error fetching units:', err);
        setFetchError(err instanceof Error ? err.message : 'Failed to load units.');
        setUnits([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUnits();
  }, [propertyId]);

  return (
    <FormControl fullWidth error={error || !!fetchError}>
      <InputLabel id="unit-select-label">Unit</InputLabel>
      <Select
        labelId="unit-select-label"
        id="unit-select"
        value={loading || fetchError ? '' : value}
        label="Unit"
        onChange={onChange}
        disabled={disabled || loading || !!fetchError || !propertyId}
      >
        {loading && (
          <MenuItem value="" disabled>
            <CircularProgress size={20} style={{ marginRight: '8px' }} />
            Loading units...
          </MenuItem>
        )}
        {fetchError && (
          <MenuItem value="" disabled>
            Error loading units
          </MenuItem>
        )}
        {!loading && !fetchError && units.length === 0 && propertyId && (
          <MenuItem value="" disabled>
            No units found for this property
          </MenuItem>
        )}
        {!loading && !fetchError && units.length === 0 && !propertyId && (
          <MenuItem value="" disabled>
            Select a property first
          </MenuItem>
        )}
        {!loading && !fetchError && units.map((unit) => (
          <MenuItem key={unit.id || unit.unit_number} value={unit.unit_number}>
            {unit.unit_number}
          </MenuItem>
        ))}
      </Select>
      {(helperText || fetchError) && (
        <FormHelperText error={!!fetchError}>{fetchError || helperText}</FormHelperText>
      )}
    </FormControl>
  );
};

export default UnitSelect;
