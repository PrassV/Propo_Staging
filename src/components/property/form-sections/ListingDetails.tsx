import InputField from '../../auth/InputField';
import { PropertyFormData } from '../../../types/property';

interface ListingDetailsProps {
  value: PropertyFormData;
  onChange: (data: PropertyFormData) => void;
  disabled?: boolean;
}

export default function ListingDetails({ value, onChange, disabled }: ListingDetailsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Listing Details</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <InputField
          label="Size in ft²"
          type="number"
          value={value.sizeSqft?.toString() || ''}
          onChange={(e) => onChange({ ...value, sizeSqft: parseInt(e.target.value) })}
          placeholder="Ex: 3,210 sqft"
          disabled={disabled}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
          <select
            value={value.bedrooms?.toString() || ''}
            onChange={(e) => onChange({ ...value, bedrooms: parseInt(e.target.value) })}
            className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
            disabled={disabled}
          >
            <option value="">Select</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
          <select
            value={value.bathrooms?.toString() || ''}
            onChange={(e) => onChange({ ...value, bathrooms: parseInt(e.target.value) })}
            className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
            disabled={disabled}
          >
            <option value="">Select</option>
            {[1, 2, 3, 4, 5].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kitchens</label>
          <select
            value={value.kitchens?.toString() || ''}
            onChange={(e) => onChange({ ...value, kitchens: parseInt(e.target.value) })}
            className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
            disabled={disabled}
          >
            <option value="">Select</option>
            {[1, 2, 3].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Garages</label>
          <select
            value={value.garages?.toString() || ''}
            onChange={(e) => onChange({ ...value, garages: parseInt(e.target.value) })}
            className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
            disabled={disabled}
          >
            <option value="">Select</option>
            {[0, 1, 2, 3].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>

        <InputField
          label="Garage Size"
          type="number"
          value={value.garageSize?.toString() || ''}
          onChange={(e) => onChange({ ...value, garageSize: parseInt(e.target.value) })}
          placeholder="Ex: 1,230 sqft"
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InputField
          label="Year Built"
          type="number"
          value={value.yearBuilt?.toString() || ''}
          onChange={(e) => onChange({ ...value, yearBuilt: parseInt(e.target.value) })}
          placeholder="Type Year"
          disabled={disabled}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Floors</label>
          <select
            value={value.floors?.toString() || ''}
            onChange={(e) => onChange({ ...value, floors: parseInt(e.target.value) })}
            className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
            disabled={disabled}
          >
            <option value="">Select</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}