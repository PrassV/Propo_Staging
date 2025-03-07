import InputField from '../../auth/InputField';
import { PropertyFormData } from '../../../types/property';

interface BasicDetailsProps {
  value: PropertyFormData;
  onChange: (data: PropertyFormData) => void;
  disabled?: boolean;
}

export default function BasicDetails({ value, onChange, disabled }: BasicDetailsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Basic Details</h3>
      
      <InputField
        label="Property Name"
        type="text"
        value={value.propertyName}
        onChange={(e) => onChange({ ...value, propertyName: e.target.value })}
        required
        disabled={disabled}
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Property Type
          </label>
          <select
            value={value.propertyType}
            onChange={(e) => onChange({ ...value, propertyType: e.target.value })}
            className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
            required
            disabled={disabled}
          >
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="vacant_land">Vacant Land</option>
            <option value="hostel_pg">Hostel/PG</option>
            <option value="other">Other</option>
          </select>
        </div>

        <InputField
          label="Number of Units"
          type="number"
          value={String(value.numberOfUnits)}
          onChange={(e) => {
            const units = parseInt(e.target.value);
            onChange({
              ...value,
              numberOfUnits: isNaN(units) ? 1 : Math.max(1, units)
            });
          }}
          required
          disabled={disabled}
          min="1"
        />
      </div>
    </div>
  );
}