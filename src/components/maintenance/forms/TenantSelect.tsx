import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface TenantSelectProps {
  propertyId: string;
  unitNumber?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function TenantSelect({ propertyId, unitNumber, value, onChange, disabled }: TenantSelectProps) {
  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenants = async () => {
      if (!propertyId) {
        setTenants([]);
        setLoading(false);
        return;
      }

      try {
        let query = supabase
          .from('property_tenants')
          .select(`
            tenant_id,
            tenant:tenants(id, name)
          `)
          .eq('property_id', propertyId);

        if (unitNumber) {
          query = query.eq('unit_number', unitNumber);
        }

        const { data, error } = await query;
        if (error) throw error;

        const formattedTenants = data
          .map(pt => pt.tenant)
          .filter(Boolean)
          .map(t => ({ id: t.id, name: t.name }));

        setTenants(formattedTenants);
      } catch (error) {
        console.error('Error fetching tenants:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTenants();
  }, [propertyId, unitNumber]);

  if (loading) {
    return (
      <select disabled className="w-full p-3 border rounded-lg">
        <option>Loading tenants...</option>
      </select>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
      required
      disabled={disabled || !propertyId}
    >
      <option value="">Select Tenant</option>
      {tenants.map((tenant) => (
        <option key={tenant.id} value={tenant.id}>
          {tenant.name}
        </option>
      ))}
    </select>
  );
}