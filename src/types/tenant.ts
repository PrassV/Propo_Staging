export type RentalType = 'lease' | 'rent';
export type RentalFrequency = 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
export type BillResponsibility = 'tenant' | 'landlord' | 'shared';

export interface UtilityDetails {
  electricity_responsibility: BillResponsibility;
  water_responsibility: BillResponsibility;
  property_tax_responsibility: BillResponsibility;
  maintenance_fee: number;
  notice_period_days: number;
}

export interface RentalDetails {
  rental_type: RentalType;
  rental_frequency?: RentalFrequency;
  rental_amount?: string | number;
  maintenance_fee?: string | number;
  advance_amount?: string | number;
  rental_start_date?: string;
  rental_end_date?: string;
  lease_amount?: string | number;
  lease_start_date?: string;
  lease_end_date?: string;
  utility_details?: UtilityDetails;
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  gender: 'male' | 'female' | 'other';
  familySize: string | number;
  permanentAddress: string;
  rental_type?: RentalType;
  rental_frequency?: RentalFrequency;
  rental_amount?: string | number;
  maintenance_fee?: string | number;
  advance_amount?: string | number;
  rental_start_date?: string;
  rental_end_date?: string;
  lease_amount?: string | number;
  lease_start_date?: string;
  lease_end_date?: string;
  utility_details?: UtilityDetails;
  created_at?: string;
}

export interface TenantFormData {
  name: string;
  phone: string;
  email: string;
  dob: string;
  gender: 'male' | 'female' | 'other';
  familySize: string | number;
  permanentAddress: string;
  idType: 'pan_card' | 'aadhaar' | 'passport' | 'ration_card';
  idNumber: string;
  idProof: File | null;
  rental_details: RentalDetails;
  utility_details: UtilityDetails;
}