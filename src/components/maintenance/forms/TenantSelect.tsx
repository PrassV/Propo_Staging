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
import { getTenants } from '@/api/services/tenantService';
import { Tenant } from '@/api/types';

interface TenantSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  propertyId?: string;
}

const TenantSelect: React.FC<TenantSelectProps> = ({ 
  value, 
  onChange, 
  disabled, 
  error, 
  helperText, 
  propertyId 
}) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenants = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const response = await getTenants({ property_id: propertyId });
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
  }, [propertyId]);

  return (
    <div className="space-y-2">
      <Label htmlFor="tenant-select" className={error || fetchError ? 'text-destructive' : ''}>
        Tenant
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
                Loading tenants...
              </div>
            ) : fetchError ? (
              "Error loading tenants"
            ) : tenants.length === 0 ? (
              "No tenants found"
            ) : (
              "Select a tenant"
            )
          } />
        </SelectTrigger>
        <SelectContent>
          {!loading && !fetchError && tenants.map((tenant) => (
            <SelectItem key={tenant.id} value={tenant.id}>
              {tenant.name} - {tenant.email}
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

export default TenantSelect;