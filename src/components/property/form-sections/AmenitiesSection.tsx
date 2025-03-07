import { PropertyFormData } from '../../../types/property';

interface AmenitiesSectionProps {
  value: PropertyFormData;
  onChange: (data: PropertyFormData) => void;
  disabled?: boolean;
}

const AMENITY_GROUPS = {
  'Basic Amenities': [
    { value: 'power_backup', label: 'Power Backup' },
    { value: 'water_storage', label: 'Water Storage' },
    { value: 'security_guard', label: 'Security Guard' },
    { value: 'cctv', label: 'CCTV Surveillance' },
    { value: 'intercom', label: 'Intercom' }
  ],
  'Parking': [
    { value: 'covered_parking', label: 'Covered Parking' },
    { value: 'visitor_parking', label: 'Visitor Parking' },
    { value: 'two_wheeler_parking', label: 'Two Wheeler Parking' }
  ],
  'Utilities': [
    { value: 'piped_gas', label: 'Piped Gas' },
    { value: 'rainwater_harvesting', label: 'Rainwater Harvesting' },
    { value: 'solar_panels', label: 'Solar Panels' }
  ],
  'Common Areas': [
    { value: 'lift', label: 'Lift' },
    { value: 'garden', label: 'Garden' },
    { value: 'temple', label: 'Temple' },
    { value: 'community_hall', label: 'Community Hall' },
    { value: 'children_play_area', label: 'Children Play Area' }
  ],
  'House Features': [
    { value: 'vastu_compliant', label: 'Vastu Compliant' },
    { value: 'pooja_room', label: 'Pooja Room' },
    { value: 'servant_room', label: 'Servant Room' },
    { value: 'study_room', label: 'Study Room' },
    { value: 'store_room', label: 'Store Room' },
    { value: 'balcony', label: 'Balcony' },
    { value: 'modular_kitchen', label: 'Modular Kitchen' }
  ],
  'Facilities': [
    { value: 'gym', label: 'Gym' },
    { value: 'swimming_pool', label: 'Swimming Pool' },
    { value: 'clubhouse', label: 'Clubhouse' }
  ]
};

export default function AmenitiesSection({ value, onChange, disabled }: AmenitiesSectionProps) {
  const handleToggle = (amenity: string) => {
    const amenities = value.amenities || [];
    const newAmenities = amenities.includes(amenity)
      ? amenities.filter(a => a !== amenity)
      : [...amenities, amenity];
    onChange({ ...value, amenities: newAmenities });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Property Amenities</h3>
      
      {Object.entries(AMENITY_GROUPS).map(([groupName, amenities]) => (
        <div key={groupName} className="space-y-3">
          <h4 className="font-medium text-gray-700">{groupName}</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {amenities.map(({ value: amenity, label }) => (
              <label key={amenity} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.amenities?.includes(amenity) || false}
                  onChange={() => handleToggle(amenity)}
                  disabled={disabled}
                  className="rounded border-gray-300 text-black focus:ring-black"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}