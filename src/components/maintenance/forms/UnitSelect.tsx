import React, { useState, useEffect } from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

// Import service and type
import { getUnitsForProperty } from '@/api/services/propertyService';
import { UnitDetails } from '@/api/types';

interface UnitSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  propertyId?: string;
}

const UnitSelect: React.FC<UnitSelectProps> = ({ 
  value, 
  onChange, 
  disabled, 
  error, 
  helperText, 
  propertyId 
}) => {
  const [units, setUnits] = useState<UnitDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUnits = async () => {
      if (!propertyId) {
        setUnits([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setFetchError(null);
      try {
        const response = await getUnitsForProperty(propertyId);
        setUnits(response || []);
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
    <div className="space-y-2">
      <Label htmlFor="unit-select" className={error || fetchError ? 'text-destructive' : ''}>
        Unit
      </Label>
      <Select
        value={loading || fetchError || !propertyId ? '' : value}
        onValueChange={onChange}
        disabled={disabled || loading || !!fetchError || !propertyId}
      >
        <SelectTrigger className={`w-full ${error || fetchError ? 'border-destructive' : ''}`}>
          <SelectValue placeholder={
            !propertyId ? (
              "Select a property first"
            ) : loading ? (
              <div className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading units...
              </div>
            ) : fetchError ? (
              "Error loading units"
            ) : units.length === 0 ? (
              "No units found"
            ) : (
              "Select a unit"
            )
          } />
        </SelectTrigger>
        <SelectContent>
          {!loading && !fetchError && propertyId && units.map((unit) => (
            <SelectItem key={unit.id} value={unit.id}>
              Unit {unit.unit_number} - {unit.status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {(helperText || fetchError) && (
        <p className={`text-sm ${fetchError ? 'text-destructive' : 'text-muted-foreground'}`}>
          {fetchError || helperText}
        </p>
      )}
    </div>
  );
};

export default UnitSelect;
