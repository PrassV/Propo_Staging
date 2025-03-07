import { Search } from 'lucide-react';
import { useState } from 'react';

interface MapLocationProps {
  value?: {
    lat: number;
    lng: number;
    address?: string;
  };
  onChange: (location: { lat: number; lng: number; address: string }) => void;
  disabled?: boolean;
}

export default function MapLocation({ value, onChange, disabled }: MapLocationProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      // Use OpenStreetMap Nominatim API for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();

      if (data && data[0]) {
        const { lat, lon: lng, display_name } = data[0];
        onChange({
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          address: display_name
        });
        setError(null);
      } else {
        setError('Location not found');
      }
    } catch (err) {
      console.error('Error searching location:', err);
      setError('Failed to search location');
    }
  };

  const mapUrl = value?.lat && value?.lng
    ? `https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${value.lat},${value.lng}&zoom=16`
    : `https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=India&zoom=4`;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Map Location
      </label>

      <form onSubmit={handleSearch} className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for a location..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white shadow-sm focus:outline-none focus:border-black"
          disabled={disabled}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </form>

      <div className="relative w-full h-[400px] rounded-lg overflow-hidden border">
        <iframe
          src={mapUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0"
        />
      </div>

      {value?.address && (
        <p className="text-sm text-gray-600 mt-2">
          Selected location: {value.address}
        </p>
      )}
    </div>
  );
}