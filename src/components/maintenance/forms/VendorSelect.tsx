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
import { getVendors } from '@/api/services/vendorService';
import { Vendor } from '@/api/types';

interface VendorSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  category?: string;
}

const VendorSelect: React.FC<VendorSelectProps> = ({ 
  value, 
  onChange, 
  disabled, 
  error, 
  helperText, 
  category 
}) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const response = await getVendors({ category });
        setVendors(response || []);
      } catch (err: unknown) {
        console.error('Error fetching vendors:', err);
        setFetchError(err instanceof Error ? err.message : 'Failed to load vendors.');
        setVendors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, [category]);

  return (
    <div className="space-y-2">
      <Label htmlFor="vendor-select" className={error || fetchError ? 'text-destructive' : ''}>
        Vendor
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
                Loading vendors...
              </div>
            ) : fetchError ? (
              "Error loading vendors"
            ) : vendors.length === 0 ? (
              "No vendors found"
            ) : (
              "Select a vendor"
            )
          } />
        </SelectTrigger>
        <SelectContent>
          {!loading && !fetchError && vendors.map((vendor) => (
            <SelectItem key={vendor.id} value={vendor.id}>
              {vendor.company_name} - {vendor.category}
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

export default VendorSelect;