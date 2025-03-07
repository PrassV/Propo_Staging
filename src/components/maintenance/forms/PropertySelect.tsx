import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface Property {
  id: string;
  property_name: string;
  address_line1: string;
  city: string;
}

interface PropertySelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function PropertySelect({ value, onChange, disabled }: PropertySelectProps) {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('id, property_name, address_line1, city')
          .eq('owner_id', user.id);

        if (error) throw error;
        setProperties(data || []);
      } catch (error) {
        console.error('Error fetching properties:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [user]);

  if (loading) {
    return (
      <select disabled className="w-full p-3 border rounded-lg">
        <option>Loading properties...</option>
      </select>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
      required
      disabled={disabled}
    >
      <option value="">Select Property</option>
      {properties.map((property) => (
        <option key={property.id} value={property.id}>
          {property.property_name} - {property.address_line1}, {property.city}
        </option>
      ))}
    </select>
  );
}