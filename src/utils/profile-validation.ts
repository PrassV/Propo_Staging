import { ProfileFormData } from '../types/profile';

export const validateProfileForm = (data: ProfileFormData) => {
  const errors: Partial<Record<keyof ProfileFormData, string>> = {};

  if (!data.firstName.trim()) {
    errors.firstName = 'First name is required';
  }

  if (!data.lastName.trim()) {
    errors.lastName = 'Last name is required';
  }

  if (!data.phone.trim()) {
    errors.phone = 'Phone number is required';
  } else if (!/^\d{10}$/.test(data.phone)) {
    errors.phone = 'Invalid phone number format';
  }

  if (!data.addressLine1.trim()) {
    errors.addressLine1 = 'Address is required';
  }

  if (!data.city.trim()) {
    errors.city = 'City is required';
  }

  if (!data.state.trim()) {
    errors.state = 'State is required';
  }

  if (!data.pincode.trim()) {
    errors.pincode = 'Pincode is required';
  } else if (!/^\d{6}$/.test(data.pincode)) {
    errors.pincode = 'Invalid pincode format';
  }

  return errors;
};