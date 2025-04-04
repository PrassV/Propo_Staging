import { useState, useEffect } from 'react';
import InputField from '../auth/InputField';
import { ProfileFormData } from '../../types/profile';
import { validateProfileForm } from '../../utils/profile-validation';
import toast from 'react-hot-toast';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface ProfileFormProps {
  initialData: Partial<ProfileFormData> & { id?: string; role?: 'owner' | 'tenant' | 'admin' | null };
  onSave: (updatedData: Partial<ProfileFormData>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function ProfileForm({ initialData, onSave, onCancel, loading = false }: ProfileFormProps) {
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    role: 'owner',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const currentRole = initialData.role;
    const defaultRole = (currentRole === 'owner' || currentRole === 'tenant') ? currentRole : 'owner';

    setFormData({
      firstName: initialData.firstName || '',
      lastName: initialData.lastName || '',
      phone: initialData.phone || '',
      addressLine1: initialData.addressLine1 || '',
      addressLine2: initialData.addressLine2 || '',
      city: initialData.city || '',
      state: initialData.state || '',
      pincode: initialData.pincode || '',
      role: defaultRole,
    });
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Debug what's being submitted
    console.log('Submitting form data:', formData);
    
    if (!initialData.role && !formData.role) {
        toast.error("Please select your role (Owner or Tenant).");
        setErrors(prev => ({ ...prev, role: 'Role is required.'}));
        return;
    }

    const validationErrors = validateProfileForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      // Pass the form data directly to the parent handler
      await onSave(formData);
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      let errorMessage = 'Failed to update profile';
      if (error && typeof error === 'object' && 'response' in error && 
          error.response && typeof error.response === 'object' && 'data' in error.response &&
          error.response.data && typeof error.response.data === 'object' && 'detail' in error.response.data) {
           errorMessage = (error.response.data as { detail: string }).detail;
      } else if (error instanceof Error) {
           errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof Omit<ProfileFormData, 'role'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleRoleChange = (value: 'owner' | 'tenant') => {
     setFormData(prev => ({ ...prev, role: value }));
     if (errors.role) {
      setErrors(prev => ({ ...prev, role: '' }));
    }
  };

  const isDisabled = loading || submitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <InputField
          label="First Name"
          type="text"
          value={formData.firstName}
          onChange={(e) => handleInputChange('firstName', e.target.value)}
          error={errors.firstName}
          required
          disabled={isDisabled}
        />
        <InputField
          label="Last Name"
          type="text"
          value={formData.lastName}
          onChange={(e) => handleInputChange('lastName', e.target.value)}
          error={errors.lastName}
          required
          disabled={isDisabled}
        />
      </div>

      <InputField
        label="Phone"
        type="tel"
        value={formData.phone}
        onChange={(e) => handleInputChange('phone', e.target.value)}
        error={errors.phone}
        required
        disabled={isDisabled}
      />

      <div className="space-y-4">
        <InputField
          label="Address Line 1"
          type="text"
          value={formData.addressLine1}
          onChange={(e) => handleInputChange('addressLine1', e.target.value)}
          error={errors.addressLine1}
          required
          disabled={isDisabled}
        />
        <InputField
          label="Address Line 2"
          type="text"
          value={formData.addressLine2}
          onChange={(e) => handleInputChange('addressLine2', e.target.value)}
          disabled={isDisabled}
        />
        <div className="grid grid-cols-3 gap-4">
          <InputField
            label="City"
            type="text"
            value={formData.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            error={errors.city}
            required
            disabled={isDisabled}
          />
          <InputField
            label="State"
            type="text"
            value={formData.state}
            onChange={(e) => handleInputChange('state', e.target.value)}
            error={errors.state}
            required
            disabled={isDisabled}
          />
          <InputField
            label="Pincode"
            type="text"
            value={formData.pincode}
            onChange={(e) => handleInputChange('pincode', e.target.value)}
            error={errors.pincode}
            required
            disabled={isDisabled}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className={`${errors.role ? 'text-red-600' : ''}`}>Select Role *</Label>
        <RadioGroup 
          value={formData.role as string} 
          onValueChange={handleRoleChange} 
          className="flex space-x-4"
          disabled={isDisabled}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="owner" id="role-owner" disabled={isDisabled} />
            <Label htmlFor="role-owner">Property Owner</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="tenant" id="role-tenant" disabled={isDisabled} />
            <Label htmlFor="role-tenant">Tenant</Label>
          </div>
        </RadioGroup>
        {errors.role && <p className="text-sm text-red-600 mt-1">{errors.role}</p>}
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          disabled={isDisabled}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          disabled={isDisabled}
        >
          {submitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}