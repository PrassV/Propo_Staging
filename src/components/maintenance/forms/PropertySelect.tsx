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
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
}

const PropertySelect: React.FC<PropertySelectProps> = ({ value, onChange, disabled, error, helperText }) => {
  // Remove user state, not needed for fetching
  // const { user } = useAuth(); 
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
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
    <div className="space-y-2">
      <Label htmlFor="property-select" className={error || fetchError ? 'text-destructive' : ''}>
        Property
      </Label>
      <Select
        value={loading || fetchError ? '' : value}
        onValueChange={onChange}
        disabled={disabled || loading || !!fetchError}
      >
        <SelectTrigger className={`w-full ${error || fetchError ? 'border-destructive' : ''}`}>
          <SelectValue placeholder={
            loading ? (
              <div className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading properties...
              </div>
            ) : fetchError ? (
              "Error loading properties"
            ) : properties.length === 0 ? (
              "No properties found"
            ) : (
              "Select a property"
            )
          } />
        </SelectTrigger>
        <SelectContent>
          {!loading && !fetchError && properties.map((property) => (
            <SelectItem key={property.id} value={property.id}>
              {property.property_name} - {property.address_line1}, {property.city}
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

export default PropertySelect;