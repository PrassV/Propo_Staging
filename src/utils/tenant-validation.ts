import { TenantFormData } from '../types/tenant';
import { calculateAge } from './date';

export const validateTenantForm = (data: TenantFormData) => {
  const errors: Partial<Record<keyof TenantFormData | keyof TenantFormData['rental_details'], string>> = {};

  // Basic tenant validation
  if (!data.name.trim()) {
    errors.name = 'Name is required';
  }

  if (!data.phone.trim()) {
    errors.phone = 'Phone number is required';
  } else if (!/^\d{10}$/.test(data.phone)) {
    errors.phone = 'Invalid phone number';
  }

  if (!data.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Invalid email format';
  }

  if (!data.dob) {
    errors.dob = 'Date of birth is required';
  } else {
    const age = calculateAge(data.dob);
    if (age < 18) {
      errors.dob = 'Tenant must be at least 18 years old';
    }
  }

  if (!data.gender) {
    errors.gender = 'Gender is required';
  }

  if (!data.familySize || data.familySize < 1) {
    errors.familySize = 'Family size must be at least 1';
  }

  if (!data.permanentAddress.trim()) {
    errors.permanentAddress = 'Permanent address is required';
  }

  if (!data.idType) {
    errors.idType = 'ID type is required';
  }

  if (!data.idNumber.trim()) {
    errors.idNumber = 'ID number is required';
  }

  if (!data.idProof) {
    errors.idProof = 'ID proof document is required';
  }

  // Rental details validation
  const rd = data.rental_details;

  if (!rd.rental_type) {
    errors.rental_type = 'Rental type is required';
  }

  if (rd.rental_type === 'rent') {
    if (!rd.rental_frequency) {
      errors.rental_frequency = 'Rental frequency is required';
    }
    if (!rd.rental_amount || rd.rental_amount <= 0) {
      errors.rental_amount = 'Valid rental amount is required';
    }
    if (!rd.advance_amount || rd.advance_amount <= 0) {
      errors.advance_amount = 'Valid advance amount is required';
    }
    if (!rd.rental_start_date) {
      errors.rental_start_date = 'Rental start date is required';
    }
    if (!rd.rental_end_date) {
      errors.rental_end_date = 'Rental end date is required';
    }
    if (rd.rental_start_date && rd.rental_end_date && new Date(rd.rental_start_date) >= new Date(rd.rental_end_date)) {
      errors.rental_end_date = 'End date must be after start date';
    }
  }

  if (rd.rental_type === 'lease') {
    if (!rd.lease_amount || rd.lease_amount <= 0) {
      errors.lease_amount = 'Valid lease amount is required';
    }
    if (!rd.lease_start_date) {
      errors.lease_start_date = 'Lease start date is required';
    }
    if (!rd.lease_end_date) {
      errors.lease_end_date = 'Lease end date is required';
    }
    if (rd.lease_start_date && rd.lease_end_date && new Date(rd.lease_start_date) >= new Date(rd.lease_end_date)) {
      errors.lease_end_date = 'End date must be after start date';
    }
  }

  return errors;
};