import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface UnitSelectProps {
  propertyId: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function UnitSelect({ propertyId, value, onChange, disabled }: UnitSelectProps) {
  const [units, setUnits] = useState<Array<{ unit_number: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUnits = async () => {
      if (!propertyId) {
        setUnits([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('property_tenants')
          .select('unit_number')
          .eq('property_id', propertyId)
          .not('unit_number', 'is', null);

        if (error) throw error;
        setUnits(data || []);
      } catch (error) {
        console.error('Error fetching units:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUnits();
  }, [propertyId]);

  if (loading) {
    return (
      <select disabled className="w-full p-3 border rounded-lg">
        <option>Loading units...</option>
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
      <option value="">Select Unit</option>
      {units.map((unit) => (
        <option key={unit.unit_number} value={unit.unit_number}>
          Unit {unit.unit_number}
        </option>
      ))}
    </select>
  );
}
