// Centralized validation utilities
import { PropertyFormData } from '../types/property';
import { TenantFormData } from '../types/tenant';
import { MaintenanceRequest } from '../types/maintenance';

export const validatePropertyForm = (data: PropertyFormData) => {
  const errors: Partial<Record<keyof PropertyFormData, string>> = {};

  if (!data.propertyName?.trim()) {
    errors.propertyName = 'Property name is required';
  }

  if (!data.addressLine1?.trim()) {
    errors.addressLine1 = 'Address is required';
  }

  if (!data.city?.trim()) {
    errors.city = 'City is required';
  }

  if (!data.state?.trim()) {
    errors.state = 'State is required';
  }

  if (!data.pincode?.trim()) {
    errors.pincode = 'Pincode is required';
  } else if (!/^\d{6}$/.test(data.pincode)) {
    errors.pincode = 'Invalid pincode format';
  }

  if (!data.propertyType) {
    errors.propertyType = 'Property type is required';
  }

  if (!data.numberOfUnits || data.numberOfUnits < 1) {
    errors.numberOfUnits = 'Number of units must be at least 1';
  }

  return errors;
};

export const validateTenantForm = (data: TenantFormData) => {
  const errors: Partial<Record<keyof TenantFormData, string>> = {};

  if (!data.name?.trim()) {
    errors.name = 'Name is required';
  }

  if (!data.phone?.trim()) {
    errors.phone = 'Phone number is required';
  } else if (!/^\d{10}$/.test(data.phone)) {
    errors.phone = 'Invalid phone number';
  }

  if (!data.email?.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Invalid email format';
  }

  return errors;
};

export const validateMaintenanceRequest = (data: MaintenanceRequest) => {
  const errors: Partial<Record<keyof MaintenanceRequest, string>> = {};

  if (!data.title?.trim()) {
    errors.title = 'Title is required';
  }

  if (!data.description?.trim()) {
    errors.description = 'Description is required';
  }

  if (!data.priority) {
    errors.priority = 'Priority is required';
  }

  if (!data.category) {
    errors.category = 'Category is required';
  }

  return errors;
};

export const validateFileUpload = (file: File, maxSize: number = 5 * 1024 * 1024) => {
  const errors: string[] = [];

  if (file.size > maxSize) {
    errors.push(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    errors.push('Invalid file type. Allowed types: JPG, PNG, GIF, PDF');
  }

  return errors;
};