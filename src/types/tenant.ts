export type RentalType = 'lease' | 'rent';
export type RentalFrequency = 'monthly' | 'yearly' | 'other';
export type BillResponsibility = 'tenant' | 'owner' | 'split';
export type Gender = "male" | "female" | "other" | "prefer_not_to_say";
export type IdType = "passport" | "driving_license" | "national_id" | "other";

export interface Tenant {
  id: string;
  user_id?: string;
  name: string;
  phone?: string;
  email?: string;
  dob?: string;
  gender?: Gender;
  family_size?: number;
  permanent_address?: string;
  id_type?: IdType;
  id_number?: string;
  id_proof_url?: string;
  university?: string;
  rental_type?: RentalType;
  rental_frequency?: RentalFrequency;
  rental_amount?: number;
  advance_amount?: number;
  rental_start_date?: string;
  rental_end_date?: string;
  lease_amount?: number;
  lease_start_date?: string;
  lease_end_date?: string;
  maintenance_fee?: number;
  notice_period_days?: number;
  electricity_responsibility?: BillResponsibility;
  water_responsibility?: BillResponsibility;
  property_tax_responsibility?: BillResponsibility;
  created_at: string;
  updated_at?: string;
  property?: Property;
}

export interface TenantUpdate {
  name?: string;
  phone?: string;
  email?: string;
  dob?: string;
  gender?: Gender;
  family_size?: number;
  permanent_address?: string;
  id_type?: IdType;
  id_number?: string;
  id_proof_url?: string;
  university?: string;
  rental_type?: RentalType;
  rental_frequency?: RentalFrequency;
  rental_amount?: number;
  advance_amount?: number;
  rental_start_date?: string;
  rental_end_date?: string;
  lease_amount?: number;
  lease_start_date?: string;
  lease_end_date?: string;
  maintenance_fee?: number;
  notice_period_days?: number;
  electricity_responsibility?: BillResponsibility;
  water_responsibility?: BillResponsibility;
  property_tax_responsibility?: BillResponsibility;
}

export interface TenantCreate {
  name: string;
  email: string;
  property_id: string;
  unit_number: string;
  tenancy_start_date: string;
  phone?: string;
  dob?: string;
  gender?: Gender;
  family_size?: number;
  permanent_address?: string;
  id_type?: IdType;
  id_number?: string;
  id_proof_url?: string;
  university?: string;
  rental_type?: RentalType;
  rental_frequency?: RentalFrequency;
  rental_amount?: number;
  advance_amount?: number;
  rental_start_date?: string;
  rental_end_date?: string;
  lease_amount?: number;
  lease_start_date?: string;
  lease_end_date?: string;
  maintenance_fee?: number;
  notice_period_days?: number;
  electricity_responsibility?: BillResponsibility;
  water_responsibility?: BillResponsibility;
  property_tax_responsibility?: BillResponsibility;
  tenancy_end_date?: string;
}

import { Property } from './property';

export interface TenantWithProperty extends Tenant {
  property?: Property;
}

// Define the structure for the tenant onboarding form state
export interface TenantFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  familySize: string; // Or number if parsed
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  idType: string; // Consider defining specific ID types: 'aadhaar' | 'pan_card' | 'passport'
  idNumber: string;
  idProof: File | null;
}