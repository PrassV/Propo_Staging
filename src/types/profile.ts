export interface Profile {
  id: string;
  role?: 'owner' | 'tenant' | 'admin' | null;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface ProfileFormData {
  firstName: string;
  lastName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  role: 'owner' | 'tenant' | null;
}