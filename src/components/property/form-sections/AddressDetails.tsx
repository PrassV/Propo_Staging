import InputField from '../../auth/InputField';
import { PropertyFormData } from '../../../types/property';

interface AddressDetailsProps {
  value: PropertyFormData;
  onChange: (data: PropertyFormData) => void;
  disabled?: boolean;
}

export default function AddressDetails({ value, onChange, disabled }: AddressDetailsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Address Details</h3>

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

        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Survey Number"
            type="text"
            value={value.surveyNumber}
            onChange={(e) => onChange({ ...value, surveyNumber: e.target.value })}
            required
            disabled={disabled}
          />

          <InputField
            label="Door Number"
            type="text"
            value={value.doorNumber}
            onChange={(e) => onChange({ ...value, doorNumber: e.target.value })}
            required
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}