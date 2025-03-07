import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { MaintenanceCategory } from '../../../types/maintenance';

interface VendorSelectProps {
  category?: MaintenanceCategory;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function VendorSelect({ category, value, onChange, disabled }: VendorSelectProps) {
  const [vendors, setVendors] = useState<Array<{ id: string; name: string; categories: string[] }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        let query = supabase
          .from('maintenance_vendors')
          .select('id, name, categories');

        if (category) {
          query = query.contains('categories', [category]);
        }

        const { data, error } = await query;
        if (error) throw error;
        setVendors(data || []);
      } catch (error) {
        console.error('Error fetching vendors:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, [category]);

  if (loading) {
    return (
      <select disabled className="w-full p-3 border rounded-lg">
        <option>Loading vendors...</option>
      </select>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Preferred Vendor (Optional)
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
        disabled={disabled}
      >
        <option value="">Select Vendor (Optional)</option>
        {vendors.map((vendor) => (
          <option key={vendor.id} value={vendor.id}>
            {vendor.name} - {vendor.categories.join(', ')}
          </option>
        ))}
      </select>
    </div>
  );
}