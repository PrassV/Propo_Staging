// Aligned with backend enums
export type RentalType = 'lease' | 'rent';
export type RentalFrequency = 'monthly' | 'quarterly' | 'yearly' | 'other';
export type BillResponsibility = 'tenant' | 'owner' | 'split';
export type Gender = "male" | "female" | "other" | "prefer_not_to_say";
export type IdType = "passport" | "driving_license" | "national_id" | "pan_card" | "aadhaar" | "ration_card" | "other";

// New types for comprehensive tenant management
export type OccupationCategory = "student" | "employed" | "self_employed" | "retired" | "unemployed" | "other";
export type VerificationStatus = "pending" | "verified" | "rejected" | "expired";
export type DocumentType = "profile_photo" | "id_proof" | "income_proof" | "employment_letter" | 
                          "bank_statement" | "previous_rental_agreement" | "reference_letter" | 
                          "emergency_contact_proof" | "additional_document";
export type HistoryAction = "assigned" | "unassigned" | "terminated" | "renewed" | "status_changed" | 
                           "payment_made" | "maintenance_request" | "lease_modified";
export type ContactMethod = "email" | "phone" | "sms" | "whatsapp";
export type BackgroundCheckStatus = "pending" | "in_progress" | "completed" | "failed" | "not_required";
export type TenantStatus = "active" | "unassigned" | "inactive";

export interface Tenant {
  id: string;
  user_id?: string;
  owner_id: string;
  
  // Basic Information
  name: string;
  phone: string;
  email: string;
  profile_photo_url?: string;
  
  // Personal Details
  date_of_birth?: string;
  dob?: string; // Keep for backward compatibility
  gender?: Gender;
  family_size?: number;
  permanent_address?: string;
  
  // ID and Verification
  id_type?: IdType;
  id_number?: string;
  id_proof_url?: string;
  verification_status?: VerificationStatus;
  verification_notes?: string;
  verification_date?: string;
  
  // Employment and Income
  occupation?: string;
  occupation_category?: OccupationCategory;
  monthly_income?: number;
  employer_name?: string;
  employment_letter_url?: string;
  
  // Emergency Contact
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  
  // Banking and Financial
  bank_statement_url?: string;
  
  // Previous Rental History
  previous_landlord_name?: string;
  previous_landlord_phone?: string;
  reference_letter_url?: string;
  rental_references?: any[];
  
  // Background Check
  background_check_status?: BackgroundCheckStatus;
  background_check_url?: string;
  
  // Status and Preferences
  status?: TenantStatus;
  preferred_contact_method?: ContactMethod;
  
  // Move-in/Move-out
  move_in_date?: string;
  move_out_date?: string;
  
  // Document Management
  additional_documents?: any[];
  lease_history?: any[];
  
  // Legacy Rental/Lease Info
  university?: string;
  rental_type?: RentalType;
  rental_frequency?: RentalFrequency;
  rent?: number; // Renamed from rental_amount
  rental_start_date?: string;
  rental_end_date?: string;
  maintenance_fee?: number;
  notice_period_days?: number;
  
  // Responsibilities
  electricity_responsibility?: BillResponsibility;
  water_responsibility?: BillResponsibility;
  property_tax_responsibility?: BillResponsibility;
  
  // System fields
  created_at: string;
  updated_at?: string;
  property?: Property;
}

export interface TenantCreate {
  // Required fields
  name: string;
  email: string;
  phone: string;
  
  // Optional comprehensive onboarding fields
  profile_photo_url?: string;
  date_of_birth?: string;
  gender?: Gender;
  family_size?: number;
  permanent_address?: string;
  
  // ID and Verification
  id_type?: IdType;
  id_number?: string;
  id_proof_url?: string;
  
  // Employment and Income
  occupation?: string;
  occupation_category?: OccupationCategory;
  monthly_income?: number;
  employer_name?: string;
  employment_letter_url?: string;
  
  // Emergency Contact
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  
  // Banking and References
  bank_statement_url?: string;
  previous_landlord_name?: string;
  previous_landlord_phone?: string;
  reference_letter_url?: string;
  
  // Preferences
  preferred_contact_method?: ContactMethod;
  
  // Responsibilities
  electricity_responsibility?: BillResponsibility;
  water_responsibility?: BillResponsibility;
  property_tax_responsibility?: BillResponsibility;
  
  // Additional
  university?: string;
  notice_period_days?: number;
  status?: TenantStatus;
}

export interface TenantUpdate {
  // All fields optional for partial updates
  name?: string;
  phone?: string;
  email?: string;
  profile_photo_url?: string;
  
  // Personal Details
  date_of_birth?: string;
  dob?: string; // Keep for backward compatibility
  gender?: Gender;
  family_size?: number;
  permanent_address?: string;
  
  // ID and Verification
  id_type?: IdType;
  id_number?: string;
  id_proof_url?: string;
  verification_status?: VerificationStatus;
  verification_notes?: string;
  verification_date?: string;
  
  // Employment and Income
  occupation?: string;
  occupation_category?: OccupationCategory;
  monthly_income?: number;
  employer_name?: string;
  employment_letter_url?: string;
  
  // Emergency Contact
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  
  // Banking and References
  bank_statement_url?: string;
  previous_landlord_name?: string;
  previous_landlord_phone?: string;
  reference_letter_url?: string;
  
  // Status and Preferences
  status?: TenantStatus;
  preferred_contact_method?: ContactMethod;
  background_check_status?: BackgroundCheckStatus;
  background_check_url?: string;
  
  // Move-in/Move-out
  move_in_date?: string;
  move_out_date?: string;
  
  // Legacy fields
  rental_type?: RentalType;
  rental_frequency?: RentalFrequency;
  rent?: number;
  rental_start_date?: string;
  rental_end_date?: string;
  maintenance_fee?: number;
  notice_period_days?: number;
  
  // Responsibilities
  electricity_responsibility?: BillResponsibility;
  water_responsibility?: BillResponsibility;
  property_tax_responsibility?: BillResponsibility;
  
  // Additional
  university?: string;
}

import { Property } from './property';

export interface TenantWithProperty extends Tenant {
  property?: Property;
}

// --- Document Management Interfaces ---
export interface TenantDocument {
  id: string;
  tenant_id: string;
  document_type: DocumentType;
  document_name: string;
  file_path: string;
  file_size_bytes?: number;
  mime_type?: string;
  upload_date: string;
  verification_status?: VerificationStatus;
  verification_notes?: string;
  verified_by?: string;
  verified_at?: string;
  is_required?: boolean;
  expiry_date?: string;
  metadata?: any;
  created_at: string;
  updated_at?: string;
}

export interface TenantDocumentCreate {
  tenant_id: string;
  document_type: DocumentType;
  document_name: string;
  file_path: string;
  file_size_bytes?: number;
  mime_type?: string;
  verification_status?: VerificationStatus;
  verification_notes?: string;
  is_required?: boolean;
  expiry_date?: string;
  metadata?: any;
}

export interface TenantDocumentUpdate {
  document_name?: string;
  verification_status?: VerificationStatus;
  verification_notes?: string;
  is_required?: boolean;
  expiry_date?: string;
  metadata?: any;
}

// --- History Tracking Interfaces ---
export interface TenantHistory {
  id: string;
  tenant_id: string;
  property_id?: string;
  unit_id?: string;
  lease_id?: string;
  action: HistoryAction;
  action_date: string;
  start_date?: string;
  end_date?: string;
  rent_amount?: number;
  deposit_amount?: number;
  payment_amount?: number;
  termination_reason?: string;
  notes?: string;
  metadata?: any;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface UnitHistory {
  id: string;
  unit_id: string;
  property_id: string;
  tenant_id?: string;
  lease_id?: string;
  action: HistoryAction;
  action_date: string;
  start_date?: string;
  end_date?: string;
  rent_amount?: number;
  deposit_amount?: number;
  total_payments?: number;
  maintenance_costs?: number;
  occupancy_duration_days?: number;
  vacancy_duration_days?: number;
  notes?: string;
  metadata?: any;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

// --- Enhanced Tenant Interfaces ---
export interface TenantHistorySummary {
  total_properties: number;
  total_duration_months?: number;
  total_payments?: number;
  last_move_out_date?: string;
  current_status: TenantStatus;
  verification_completion: number; // Percentage of verification complete
}

export interface TenantWithHistory extends Tenant {
  documents: TenantDocument[];
  history: TenantHistory[];
  history_summary?: TenantHistorySummary;
  verification_progress?: Record<string, boolean>;
}

// --- File Upload Interfaces ---
export interface DocumentUploadRequest {
  document_type: DocumentType;
  document_name: string;
  is_required?: boolean;
  notes?: string;
}

export interface DocumentUploadResponse {
  success: boolean;
  document_id?: string;
  upload_url?: string;
  message: string;
}

// --- Verification Interfaces ---
export interface TenantVerificationRequest {
  verification_status: VerificationStatus;
  verification_notes?: string;
  document_ids?: string[];
}

export interface TenantVerificationResponse {
  success: boolean;
  verification_status: VerificationStatus;
  missing_documents: DocumentType[];
  next_steps: string[];
  message: string;
}



// --- Legacy/Backward Compatibility ---
// Keep the old TenantFormData interface for existing components
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

// New comprehensive onboarding form data structure
export interface ComprehensiveTenantFormData {
  // Basic Info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profilePhoto: File | null;
  
  // Personal Details
  dateOfBirth: string;
  gender: Gender;
  familySize: number;
  permanentAddress: {
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  
  // ID Verification
  idType: IdType;
  idNumber: string;
  idProof: File | null;
  
  // Employment/Income
  occupation: string;
  occupationCategory: OccupationCategory;
  monthlyIncome: number;
  employerName: string;
  employmentLetter: File | null;
  
  // Emergency Contact
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  
  // Banking
  bankStatement: File | null;
  
  // References
  previousLandlordName: string;
  previousLandlordPhone: string;
  referenceLetter: File | null;
  
  // Additional Documents
  additionalDocuments: File[];
  
  // Preferences
  preferredContactMethod: ContactMethod;
  
  // Responsibilities
  electricityResponsibility: BillResponsibility;
  waterResponsibility: BillResponsibility;
  propertyTaxResponsibility: BillResponsibility;
  
  // Additional
  university?: string;
  noticePeriodDays: number;
}