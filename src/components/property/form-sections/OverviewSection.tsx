import InputField from '../../auth/InputField';
import { PropertyFormData } from '../../../types/property';

interface OverviewSectionProps {
  value: PropertyFormData;
  onChange: (data: PropertyFormData) => void;
  disabled?: boolean;
}

export default function OverviewSection({ value, onChange, disabled }: OverviewSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Overview</h3>
      
      <InputField
        label="Property Title"
        type="text"
        value={value.propertyName}
        onChange={(e) => onChange({ ...value, propertyName: e.target.value })}
        placeholder="Your Property Name"
        required
        disabled={disabled}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={value.description || ''}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          placeholder="Write about property..."
          className="w-full p-3 border rounded-lg focus:outline-none focus:border-black min-h-[150px]"
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={value.category || ''}
            onChange={(e) => onChange({ ...value, category: e.target.value })}
            className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
            disabled={disabled}
          >
            <option value="">Select Category</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="industrial">Industrial</option>
            <option value="land">Land</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Listed in</label>
          <select
            value={value.listedIn || ''}
            onChange={(e) => onChange({ ...value, listedIn: e.target.value })}
            className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
            disabled={disabled}
          >
            <option value="">Select Listing Type</option>
            <option value="sale">For Sale</option>
            <option value="rent">For Rent</option>
            <option value="lease">For Lease</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InputField
          label="Price"
          type="number"
          value={value.price?.toString() || ''}
          onChange={(e) => onChange({ ...value, price: parseFloat(e.target.value) })}
          placeholder="Your Price"
          disabled={disabled}
        />

        <InputField
          label="Yearly Tax Rate"
          type="number"
          value={value.yearlyTaxRate?.toString() || ''}
          onChange={(e) => onChange({ ...value, yearlyTaxRate: parseFloat(e.target.value) })}
          placeholder="Tax Rate"
          disabled={disabled}
        />
      </div>
    </div>
  );
}