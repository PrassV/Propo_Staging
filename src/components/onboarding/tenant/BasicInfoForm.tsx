import InputField from '../../auth/InputField';
import { TenantFormData } from '../../../types/tenant';

interface BasicInfoFormProps {
  value: TenantFormData;
  onChange: (data: TenantFormData) => void;
  disabled?: boolean;
}

export default function BasicInfoForm({ value, onChange, disabled }: BasicInfoFormProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Basic Information</h2>

      <div className="grid grid-cols-2 gap-4">
        <InputField
          label="First Name"
          type="text"
          value={value.firstName}
          onChange={(e) => onChange({ ...value, firstName: e.target.value })}
          required
          disabled={disabled}
        />
        <InputField
          label="Last Name"
          type="text"
          value={value.lastName}
          onChange={(e) => onChange({ ...value, lastName: e.target.value })}
          required
          disabled={disabled}
        />
      </div>

      <InputField
        label="Email"
        type="email"
        value={value.email}
        onChange={(e) => onChange({ ...value, email: e.target.value })}
        required
        disabled={true} // Email is always disabled as it comes from auth
      />

      <InputField
        label="Phone Number"
        type="tel"
        value={value.phone}
        onChange={(e) => onChange({ ...value, phone: e.target.value })}
        required
        disabled={disabled}
      />

      <InputField
        label="Family Size"
        type="number"
        min="1"
        value={value.familySize}
        onChange={(e) => onChange({ ...value, familySize: e.target.value })}
        required
        disabled={disabled}
      />
    </div>
  );
}