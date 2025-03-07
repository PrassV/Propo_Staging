import InputField from '../auth/InputField';

interface UtilityDetailsFormProps {
  value: {
    maintenanceCharges: string;
    electricityBills: 'tenant' | 'landlord';
    waterCharges: 'tenant' | 'landlord';
    noticePeriod: string;
  };
  onChange: (details: any) => void;
  disabled?: boolean;
}

export default function UtilityDetailsForm({ value, onChange, disabled }: UtilityDetailsFormProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Utility & Maintenance Details</h2>

      <InputField
        label="Maintenance Charges"
        type="number"
        value={value.maintenanceCharges}
        onChange={(e) => onChange({ ...value, maintenanceCharges: e.target.value })}
        required
        disabled={disabled}
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Electricity Bills
          </label>
          <select
            value={value.electricityBills}
            onChange={(e) => onChange({ ...value, electricityBills: e.target.value })}
            className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
            required
            disabled={disabled}
          >
            <option value="tenant">Paid by Tenant</option>
            <option value="landlord">Paid by Landlord</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Water Charges
          </label>
          <select
            value={value.waterCharges}
            onChange={(e) => onChange({ ...value, waterCharges: e.target.value })}
            className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
            required
            disabled={disabled}
          >
            <option value="tenant">Paid by Tenant</option>
            <option value="landlord">Paid by Landlord</option>
          </select>
        </div>
      </div>

      <InputField
        label="Notice Period (in days)"
        type="number"
        value={value.noticePeriod}
        onChange={(e) => onChange({ ...value, noticePeriod: e.target.value })}
        required
        disabled={disabled}
        min="1"
      />
    </div>
  );
}