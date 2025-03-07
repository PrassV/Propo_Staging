import InputField from '../../auth/InputField';
import { TenantFormData } from '../../../types/tenant';

interface AddressFormProps {
  value: TenantFormData;
  onChange: (data: TenantFormData) => void;
  disabled?: boolean;
}

export default function AddressForm({ value, onChange, disabled }: AddressFormProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Permanent Address</h2>

      <div className="space-y-4">
        <InputField
          label="Address Line 1"
          type="text"
          value={value.addressLine1}
          onChange={(e) => onChange({ ...value, addressLine1: e.target.value })}
          required
          disabled={disabled}
        />

        <InputField
          label="Address Line 2"
          type="text"
          value={value.addressLine2}
          onChange={(e) => onChange({ ...value, addressLine2: e.target.value })}
          disabled={disabled}
        />

        <div className="grid grid-cols-3 gap-4">
          <InputField
            label="City"
            type="text"
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            required
            disabled={disabled}
          />

          <InputField
            label="State"
            type="text"
            value={value.state}
            onChange={(e) => onChange({ ...value, state: e.target.value })}
            required
            disabled={disabled}
          />

          <InputField
            label="Pincode"
            type="text"
            value={value.pincode}
            onChange={(e) => onChange({ ...value, pincode: e.target.value })}
            required
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}