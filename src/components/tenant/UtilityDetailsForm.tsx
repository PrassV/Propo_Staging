import InputField from '../auth/InputField';
import { BillResponsibility } from '../../types/tenant';

// Define the shape of the details object for clarity
interface UtilityDetailsValue {
  maintenanceCharges: string;
  electricity_responsibility: BillResponsibility;
  water_responsibility: BillResponsibility;
  noticePeriod: string;
}

interface UtilityDetailsFormProps {
  value: UtilityDetailsValue;
  // Use the defined shape for the onChange details parameter
  onChange: (details: UtilityDetailsValue) => void; 
  disabled?: boolean;
}

export default function UtilityDetailsForm({ value, onChange, disabled }: UtilityDetailsFormProps) {
  // Helper to create consistent onChange handlers
  const handleChange = (field: keyof UtilityDetailsValue, fieldValue: string | BillResponsibility) => {
    // Ensure the field exists on the value object before updating
    if (field in value) {
        onChange({ ...value, [field]: fieldValue });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Utility & Maintenance Details</h2>

      <InputField
        label="Maintenance Charges"
        type="number"
        value={value.maintenanceCharges}
        onChange={(e) => handleChange('maintenanceCharges', e.target.value)}
        required
        disabled={disabled}
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Electricity Bills Responsibility
          </label>
          <select
            value={value.electricity_responsibility}
            onChange={(e) => handleChange('electricity_responsibility', e.target.value as BillResponsibility)}
            className="w-full p-3 border rounded-lg focus:outline-none focus:border-black bg-input text-foreground"
            required
            disabled={disabled}
          >
            <option value="tenant">Tenant</option>
            <option value="owner">Owner</option>
            <option value="split">Split</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Water Charges Responsibility
          </label>
          <select
            value={value.water_responsibility}
            onChange={(e) => handleChange('water_responsibility', e.target.value as BillResponsibility)}
            className="w-full p-3 border rounded-lg focus:outline-none focus:border-black bg-input text-foreground"
            required
            disabled={disabled}
          >
            <option value="tenant">Tenant</option>
            <option value="owner">Owner</option>
            <option value="split">Split</option>
          </select>
        </div>
      </div>

      <InputField
        label="Notice Period (in days)"
        type="number"
        value={value.noticePeriod}
        onChange={(e) => handleChange('noticePeriod', e.target.value)}
        required
        disabled={disabled}
        min="1"
      />
    </div>
  );
}