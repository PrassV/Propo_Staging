import InputField from '../auth/InputField';
import { RentalDetails, RentalType, RentalFrequency } from '../../types/tenant';

interface RentalDetailsFormProps {
  value: RentalDetails;
  onChange: (details: RentalDetails) => void;
  errors?: Partial<Record<keyof RentalDetails, string>>;
  disabled?: boolean;
}

const RENTAL_FREQUENCIES: { value: RentalFrequency; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' }
];

export default function RentalDetailsForm({ value, onChange, errors, disabled }: RentalDetailsFormProps) {
  const handleChange = (field: keyof RentalDetails, fieldValue: string | number) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Rental Type <span className="text-red-500">*</span>
        </label>
        <select
          value={value.rental_type}
          onChange={(e) => handleChange('rental_type', e.target.value as RentalType)}
          className={`w-full p-3 border rounded-lg focus:outline-none focus:border-black ${
            errors?.rental_type ? 'border-red-500' : ''
          }`}
          required
          disabled={disabled}
        >
          <option value="">Select Type</option>
          <option value="rent">Rent</option>
          <option value="lease">Lease</option>
        </select>
        {errors?.rental_type && (
          <p className="text-red-500 text-sm">{errors.rental_type}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Payment Frequency <span className="text-red-500">*</span>
        </label>
        <select
          value={value.rental_frequency}
          onChange={(e) => handleChange('rental_frequency', e.target.value as RentalFrequency)}
          className={`w-full p-3 border rounded-lg focus:outline-none focus:border-black ${
            errors?.rental_frequency ? 'border-red-500' : ''
          }`}
          required
          disabled={disabled}
        >
          <option value="">Select Frequency</option>
          {RENTAL_FREQUENCIES.map(freq => (
            <option key={freq.value} value={freq.value}>
              {freq.label}
            </option>
          ))}
        </select>
        {errors?.rental_frequency && (
          <p className="text-red-500 text-sm">{errors.rental_frequency}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InputField
          label="Rent Amount"
          type="number"
          value={value.rental_amount || ''}
          onChange={(e) => handleChange('rental_amount', e.target.value)}
          error={errors?.rental_amount}
          required
          disabled={disabled}
          min="0"
        />
        <InputField
          label="Maintenance Fee"
          type="number"
          value={value.maintenance_fee || ''}
          onChange={(e) => handleChange('maintenance_fee', e.target.value)}
          error={errors?.maintenance_fee}
          required
          disabled={disabled}
          min="0"
        />
      </div>

      <InputField
        label="Advance Amount"
        type="number"
        value={value.advance_amount || ''}
        onChange={(e) => handleChange('advance_amount', e.target.value)}
        error={errors?.advance_amount}
        required
        disabled={disabled}
        min="0"
      />

      <div className="grid grid-cols-2 gap-4">
        <InputField
          label="Start Date"
          type="date"
          value={value.rental_start_date || ''}
          onChange={(e) => handleChange('rental_start_date', e.target.value)}
          error={errors?.rental_start_date}
          required
          disabled={disabled}
        />
        <InputField
          label="End Date"
          type="date"
          value={value.rental_end_date || ''}
          onChange={(e) => handleChange('rental_end_date', e.target.value)}
          error={errors?.rental_end_date}
          required
          disabled={disabled}
        />
      </div>
    </div>
  );
}