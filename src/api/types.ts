// Import Supabase database types for schema alignment
import type { 
  Property as SupabaseProperty,
  PropertyInsert as SupabasePropertyInsert,
  PropertyUpdate as SupabasePropertyUpdate,
  Unit as SupabaseUnit,
  UnitInsert as SupabaseUnitInsert,
  UnitUpdate as SupabaseUnitUpdate,
  Tenant as SupabaseTenant,
  TenantInsert as SupabaseTenantInsert,
  TenantUpdate as SupabaseTenantUpdate,
  Payment as SupabasePayment,
  PaymentInsert as SupabasePaymentInsert,
  PaymentUpdate as SupabasePaymentUpdate,
  MaintenanceRequest as SupabaseMaintenanceRequest,
  MaintenanceRequestInsert as SupabaseMaintenanceRequestInsert,
  MaintenanceRequestUpdate as SupabaseMaintenanceRequestUpdate,
  Document as SupabaseDocument,
  DocumentInsert as SupabaseDocumentInsert,
  DocumentUpdate as SupabaseDocumentUpdate,
  Agreement as SupabaseAgreement,
  AgreementInsert as SupabaseAgreementInsert,
  AgreementUpdate as SupabaseAgreementUpdate,
  Vendor as SupabaseVendor,
  VendorInsert as SupabaseVendorInsert,
  VendorUpdate as SupabaseVendorUpdate,
  UserProfile as SupabaseUserProfile,
  UserProfileInsert as SupabaseUserProfileInsert,
  UserProfileUpdate as SupabaseUserProfileUpdate,
  DashboardSummary as SupabaseDashboardSummary,
  PropertyType,
  TenantStatus
} from './supabase-types';

// Standard API Response types
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

// Paginated response type
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
  message?: string;
}

// Error response type
export interface ApiErrorResponse {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
  timestamp: string;
}

// Authentication
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserProfile;
}

// Use Supabase types as base and extend for frontend needs
export interface UserProfile extends Omit<SupabaseUserProfile, 'user_type'> {
  full_name?: string;
  user_type?: 'owner' | 'tenant' | 'admin' | null;
  role?: 'owner' | 'tenant' | 'admin' | null;
}

// Define and export Session type for AuthContext
export interface Session {
  access_token: string;
  user: UserProfile;
}

// Define and export AuthError type for AuthContext
export interface AuthError {
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
}

// Add this interface
export interface PropertiesListResponse {
  items: Property[];
  total: number;
}

// Property types - aligned with Supabase schema
export interface Property extends Omit<SupabaseProperty, 'status' | 'country'> {
  status: 'Rented' | 'Vacant' | 'For Sale' | 'Unknown';
  country: string;
  area?: number | null;
  area_unit?: string;
  image_url?: string;
  tenants?: Tenant[];
}

export interface PropertyCreate extends Omit<SupabasePropertyInsert, 'survey_number' | 'owner_id'> {
  area?: number;
  area_unit?: string;
  image_url?: string;
}

export interface PropertyUpdate extends Omit<SupabasePropertyUpdate, 'survey_number' | 'owner_id'> {
  area?: number;
  area_unit?: string;
  image_url?: string;
}

// Represents data collected from the Property Form (Expanded)
export interface PropertyFormData {
  propertyName: string;
  propertyType: string; // Consider specific types: 'residential' | 'commercial' | 'land'
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string; 
  country: string;
  // Fields from sub-components (add as needed, verify names)
  description?: string;
  numberOfUnits?: number; // From BasicDetails?
  category?: string;
  listedIn?: string;
  status?: string;
  price?: number;
  yearlyTaxRate?: number; // From ListingDetails?
  sizeSqft?: number; // From OverviewSection?
  bedrooms?: number; // From OverviewSection?
  bathrooms?: number; // From OverviewSection?
  kitchens?: number; // From OverviewSection?
  garages?: number; // From OverviewSection?
  garageSize?: number; // From OverviewSection?
  yearBuilt?: number; // From OverviewSection?
  floors?: number; // From OverviewSection?
  amenities?: string[]; // From AmenitiesSection? - Check data type
  surveyNumber?: string; // From original form state
  doorNumber?: string; // From original form state
}

// Represents the detailed data for a single Unit within a Property - aligned with Supabase
export interface UnitDetails extends SupabaseUnit {
  tenant_id?: string | null;
  tenant?: Tenant | null;
  current_lease_id?: string | null;
}

// Phase 3: New Types for the Lease-Centric Details Endpoint
// These types match the structure of the `GET /properties/{id}/details` response.

export interface TenantLeaseInfo {
    id: string;
    name: string;
    email: string;
}

export interface LeaseInfo {
    id: string;
    start_date: string;
    end_date: string;
    rent_amount: number;
    status: string;
    tenant: TenantLeaseInfo;
}

export interface UnitLeaseDetail {
    id: string;
    unit_number: string;
    is_occupied: boolean;
    status?: string;
    lease: LeaseInfo | null;
}

export interface PropertyLeaseDetailResponse {
    id: string;
    name: string;
    address: string;
    amenities?: string[] | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    size_sqft?: number | null;
    year_built?: number | null;
    floors?: number | null;
    property_type?: string | null;
    description?: string | null;
    units: UnitLeaseDetail[];
}
// End of Phase 3 New Types

// Phase 4: Types for Lease Creation and Management
export interface LeaseCreate {
    property_id: string;
    unit_id: string;
    tenant_id: string;
    start_date: string;
    end_date: string;
    rent_amount: number;
    deposit_amount?: number;
    notes?: string;
}

export interface Lease extends LeaseCreate {
    id: string;
    status: string;
    created_at: string;
    updated_at: string;
}

// End of Phase 4 New Types

// Represents the detailed data returned for a single property view
export interface PropertyDetails {
  id: string;
  property_name: string;
  property_type: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  status: 'Rented' | 'Vacant' | 'For Sale' | 'Unknown';
  owner_id: string;
  created_at: string;
  updated_at: string | null;
  image_urls: string[];
  units: UnitDetails[];
  documents: Document[];
  amenities?: string[] | null;
  description?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area?: number | null;
  year_built?: number | null;
  price?: number | null;
  size_sqft?: number | null;
  // Add other detailed fields if needed
}

// Define Unit type (as used in propertyService)
export interface PropertyUnit {
  id: string;
  property_id: string;
  unit_number: string;
  tenant_id?: string;
  // Add other relevant unit fields returned by GET /properties/{id}/units
  // e.g., beds?: number; baths?: number;
}

// Tenant types - aligned with Supabase schema
export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  user_id: string;
  owner_id: string;
  created_at: string | null;
  updated_at: string | null;
  dob: string;
  gender: string;
  family_size: number;
  id_type: string;
  id_number: string;
  id_proof_url: string | null;
  permanent_address: string;
  university: string | null;
  advance_amount: number | null;
  rental_amount: number | null;
  rental_start_date: string | null;
  rental_end_date: string | null;
  rental_type: string | null;
  maintenance_fee: number | null;
  lease_amount: number | null;
  lease_start_date: string | null;
  lease_end_date: string | null;
  notice_period_days: number | null;
  electricity_responsibility: string | null;
  water_responsibility: string | null;
  property_tax_responsibility: string | null;
  status?: TenantStatus;
  tenant_type?: 'individual' | 'company';
  move_in_date?: string;
  rent_amount?: number;
  rent_frequency?: 'monthly' | 'quarterly' | 'annually';
  property_id?: string;
  
  // Enriched fields from backend with property/unit information
  properties?: Array<{
    property: {
      id: string;
      property_name: string;
      address_line1: string;
      address_line2?: string;
      city: string;
      state: string;
      pincode: string;
    };
    unit?: {
      id: string;
      unit_number: string;
      floor?: number;
      area?: number;
      rent?: number;
      deposit?: number;
    };
    lease: {
      id: string;
      start_date: string;
      end_date?: string;
      rent_amount?: number;
      deposit_amount?: number;
    };
    is_active: boolean;
  }>;
  current_property?: {
    id: string;
    property_name: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    pincode: string;
  } | null;
  current_unit?: {
    id: string;
    unit_number: string;
    floor?: number;
    area?: number;
    rent?: number;
    deposit?: number;
  } | null;
  current_lease?: {
    id: string;
    start_date: string;
    end_date?: string;
    rent_amount?: number;
    deposit_amount?: number;
  } | null;
}

export interface TenantCreate extends Omit<SupabaseTenantInsert, 'dob' | 'gender' | 'family_size' | 'id_type' | 'id_number' | 'permanent_address' | 'owner_id' | 'user_id'> {
  tenant_type?: 'individual' | 'company';
  move_in_date?: string;
  lease_end_date?: string;
  rent_amount?: number;
  rent_frequency?: 'monthly' | 'quarterly' | 'annually';
  property_id: string;
}

export interface TenantUpdate extends Omit<SupabaseTenantUpdate, 'dob' | 'gender' | 'family_size' | 'id_type' | 'id_number' | 'permanent_address' | 'owner_id' | 'user_id'> {
  tenant_type?: 'individual' | 'company';
  move_in_date?: string;
  lease_end_date?: string;
  rent_amount?: number;
  rent_frequency?: 'monthly' | 'quarterly' | 'annually';
}

// Dashboard types - aligned with Supabase view
export interface DashboardSummary extends SupabaseDashboardSummary {
  // Additional computed fields for frontend
  total_revenue?: number;
  pending_rent?: number;
  maintenance_requests?: number;
  
  // Tenant Dashboard Fields
  next_due_date?: string;
  next_due_amount?: number;
  lease_end?: string;
}

export interface RecentPayment {
  id: string;
  amount: number;
  status: 'paid' | 'due' | 'overdue' | 'pending' | 'partially_paid';
  due_date: string;
  paid_at: string | null;
  tenant_name: string;
  unit_number: string;
  payment_type: string;
  description: string | null;
}

export interface MaintenanceIssue {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  property_name: string;
}

export interface DashboardData {
  summary: DashboardSummary;
  recent_payments: RecentPayment[];
  maintenance_issues: MaintenanceIssue[];
  revenue_by_month: { month: string; amount: number }[];
}

export interface TenantResponse {
  tenant: Tenant;
  message: string;
}

export interface TenantsListResponse {
  items: Tenant[];
  total: number;
  message: string;
}

export interface TenantInvitationResponse {
    invitation: TenantInvitation; // TenantInvitation is already defined
    message: string;
}

export interface TenantInvitation {
  id: string;
  property_id: string;
  tenant_id: string;
  owner_id: string;
  email: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface TenantInvitationCreate {
  property_id: string;
  tenant_id: string;
  email: string;
}

export interface TenantInvitationVerify {
  token: string;
}

// Payment types - aligned with Supabase schema
export interface Payment extends Omit<SupabasePayment, 'payment_type'> {
  payment_type: 'rent' | 'deposit' | 'maintenance' | 'other';
}

export interface PaymentCreate extends Omit<SupabasePaymentInsert, 'lease_id' | 'unit_id'> {
  payment_type: 'rent' | 'deposit' | 'maintenance' | 'other';
}

export interface PaymentUpdate {
    amount?: number;
    status?: 'pending' | 'paid' | 'overdue' | 'partially_paid' | 'cancelled';
    payment_method?: 'cash' | 'bank_transfer' | 'credit_card' | 'upi' | 'check' | 'online_platform' | 'other';
    payment_date?: string;
    description?: string;
    due_date?: string;
    notes?: string;
    amount_paid?: number;
}

// Maintenance types - aligned with Supabase schema
export type MaintenanceStatus = 'new' | 'in_progress' | 'completed' | 'rejected';

export type MaintenancePriority = 'emergency' | 'urgent' | 'normal' | 'low';

export type MaintenanceCategory = 
    'plumbing' | 'electrical' | 'carpentry' | 'painting' | 'appliance' | 'other';

export interface MaintenanceRequest extends Omit<SupabaseMaintenanceRequest, 'status' | 'priority' | 'category'> {
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  category: MaintenanceCategory;
  images?: string[];
  assigned_to?: string;
}

export interface MaintenanceRequestCreate extends Omit<SupabaseMaintenanceRequestInsert, 'created_by' | 'status' | 'priority' | 'category'> {
  priority: MaintenancePriority;
  category: MaintenanceCategory;
  // images?: string[]; // Add if API expects image URLs during creation
}

export interface MaintenanceRequestUpdate extends Omit<SupabaseMaintenanceRequestUpdate, 'status' | 'priority' | 'category'> {
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  category?: MaintenanceCategory;
  assigned_to?: string; 
}

export interface RentEstimationRequest {
  property_type: string;
  area: number;
  bedrooms: number;
  bathrooms: number;
  location: string; // Consider if backend uses more structured address
  amenities?: string[];
  furnishing_status?: string;
  // Add any other fields the backend model might expect
}

export interface RentEstimationResponse {
  estimated_rent: number;
  message: string;
  confidence_score?: number; // Example additional field from backend
  comparable_properties?: unknown[]; // Use unknown instead of any
}

export type DocumentType = 
    'lease_agreement' | 
    'id_proof' | 
    'payment_receipt' | 
    'maintenance_invoice' | 
    'maintenance_photo' | 
    'property_photo' | 
    'other';

export type DocumentStatus = 'active' | 'archived' | 'pending_review';

export type DocumentAccess = 'private' | 'shared_link' | 'shared_user';

// Document types - aligned with Supabase schema
export interface Document extends Omit<SupabaseDocument, 'document_name' | 'document_type' | 'status'> {
  title: string;
  file_name: string;
  file_type: string;
  file_path?: string;
  document_type?: DocumentType;
  access_level: DocumentAccess;
  status?: DocumentStatus;
  tags?: string[];
  unit_id?: string;
}

export interface DocumentCreate extends Omit<SupabaseDocumentInsert, 'owner_id'> {
  title?: string;
  file_name?: string;
  file_path?: string;
  access_level?: DocumentAccess;
  tags?: string[];
  unit_id?: string;
}

export interface DocumentUpdate extends SupabaseDocumentUpdate {
  title?: string; // Changed from document_name
  access_level?: DocumentAccess;
  tags?: string[];
}

export interface DocumentResponse {
  document: Document;
  message?: string;
}

export interface DocumentsResponse {
  documents: Document[];
  count: number;
  message?: string;
}

// User types - aligned with Supabase schema
export interface UserUpdate {
  first_name?: string;
  last_name?: string;
  phone?: string;
  // Can add other fields users are allowed to update
}

export interface UploadResponse {
  message: string;
  imageUrls?: string[];
  fileUrl?: string; // For single file uploads
}

export interface Report {
  id: string;
  owner_id: string;
  report_type: string;
  status: string;
  file_url?: string; // URL to the generated report file
  parameters: Record<string, unknown>; // Or a more specific type
  generated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportCreate {
  report_type: string;
  parameters: Record<string, unknown>; // Or a more specific type
  // Add other fields needed for creation
}

export interface ReportUpdate {
  parameters?: Record<string, unknown>;
  status?: string;
  // Add other updatable fields
}

export interface ReportSchedule {
  id: string;
  owner_id: string;
  report_type: string;
  schedule: string; // e.g., cron expression
  parameters: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportResponse {
  report: Report;
  message: string;
}

export interface ReportsResponse {
  reports: Report[];
  count: number;
  message: string;
}

export interface ReportScheduleResponse {
  schedule: ReportSchedule;
  message: string;
}

export interface ReportSchedulesResponse {
  schedules: ReportSchedule[];
  count: number;
  message: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string; // e.g., 'info', 'warning', 'payment_due', 'maintenance'
  is_read: boolean;
  created_at: string;
  // Add other relevant fields like related entity IDs (property_id, tenant_id)
}

export interface NotificationCreate {
  user_id: string; // Or maybe target multiple users?
  title: string;
  message: string;
  type: string;
  // Add other fields
}

export interface NotificationSettings {
  email_enabled: boolean;
  push_enabled: boolean;
  // Add specific notification type toggles if needed
  // e.g., notify_payment_due: boolean;
}

export interface NotificationResponse {
  notification: Notification;
  message: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  count: number;
  unread_count: number;
  message: string;
}

export interface NotificationSettingsResponse {
  settings: NotificationSettings;
  message: string;
}

// Agreement types - aligned with Supabase schema
export interface Agreement extends SupabaseAgreement {
  rent_frequency?: string;
}

export interface AgreementCreate extends SupabaseAgreementInsert {
  rent_frequency?: string;
  template_id?: string; // Optional template to use
}

export interface AgreementUpdate extends SupabaseAgreementUpdate {
  rent_frequency?: string;
}

export interface AgreementTemplate {
  id: string;
  name: string;
  agreement_type: string;
  content: string; // Template content (e.g., HTML, markdown)
  created_at: string;
  updated_at: string;
}

// Vendor types - aligned with Supabase schema
export interface Vendor extends Omit<SupabaseVendor, 'categories'> {
  category: string; // e.g., 'plumbing', 'electrical', 'hvac'
}

export interface VendorCreate extends Omit<SupabaseVendorInsert, 'categories' | 'owner_id'> {
  category: string;
}

export interface VendorUpdate extends Omit<SupabaseVendorUpdate, 'categories' | 'owner_id'> {
  category?: string;
}

// Lease Agreement types
export interface LeaseAgreement {
    id: string;
    property_id: string;
    unit_id: string;
    tenant_id: string;
    start_date: string; // ISO date string
    end_date: string;   // ISO date string
    rent_amount: number;
    rent_frequency: 'monthly' | 'quarterly' | 'annually' | string; // Allow other frequencies?
    deposit_amount?: number;
    status: 'active' | 'inactive' | 'expired' | 'terminated' | string;
    document_url?: string | null; // Link to the signed document file
    created_at: string;
    updated_at: string;
    // Add other relevant fields like termination details, clauses etc.
}

export interface MaintenanceComment {
    id: string;
    request_id: string;
    user_id: string;
    user_name: string; // Denormalized?
    comment: string;
    created_at: string;
    // Add other fields like attachments if supported
}

// Unit types - aligned with Supabase schema
export interface UnitCreate {
  property_id: string;
  unit_number: string;
  area_sqft?: number | null;
  bathrooms?: number | null;
  bedrooms?: number | null;
  status?: string | null;
  // Removed rent and deposit fields - these belong in lease creation
}

export interface UnitResponse {
    unit: UnitDetails;
    message?: string;
}

// Unit History Types for Phase 3
export interface HistoricalLease {
  id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  deposit_amount?: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface HistoricalTenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
}

export interface HistoricalPayment {
  id: string;
  amount: number;
  payment_type: string;
  status: string;
  due_date: string;
  payment_date?: string;
  description?: string;
  created_at: string;
}

export interface HistoricalMaintenance {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  completed_at?: string;
}

export interface UnitHistory {
  unit_id: string;
  unit_number: string;
  property_id: string;
  tenants: HistoricalTenant[];
  leases: HistoricalLease[];
  payments: HistoricalPayment[];
  maintenance_requests: HistoricalMaintenance[];
}

export interface RentAgreementFormData { 
    landlordName?: string;
    landlordAddress?: string;
    landlordPhone?: string;
    propertyAddress?: string;
    propertyType?: string;
    tenantName?: string;
    tenantEmail?: string;
    tenantPhone?: string;
    tenantAddress?: string;
    monthlyRent?: string;
    maintenanceCharges?: string;
    startDate?: string;
    leaseDuration?: string;
    // Add other fields from the form as needed
}

export interface AgreementGenerationResponse {
    agreement: string; // The generated agreement text
    success?: boolean; // Optional success flag
    // Add other potential response fields from the API
}

export interface FinancialSummary {
  total_revenue: number;
  total_expenses: number;
  net_income: number;
  occupancy_rate: number;
  rent_collection_rate: number;
  payment_history: Array<{ month: string; revenue: number; expenses: number; net_income: number; }>;
}

export interface PropertyTax {
  id: string;
  property_id: string;
  tax_year: number;
  amount: number;
  due_date: string;
  payment_date?: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  document_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PropertyTaxCreate {
  tax_year: number;
  amount: number;
  due_date: string;
  payment_date?: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  document_id?: string;
  notes?: string;
}

export interface TenantAssignment {
  tenant_id: string;
  lease_start: string;
  lease_end?: string | null;
  rent_amount?: number;
  deposit_amount?: number | null;
  notes?: string;
}

// Re-export Supabase types for direct use
export type {
  PropertyType,
  TenantStatus,
  SupabaseProperty,
  SupabasePropertyInsert,
  SupabasePropertyUpdate,
  SupabaseUnit,
  SupabaseUnitInsert,
  SupabaseUnitUpdate,
  SupabaseTenant,
  SupabaseTenantInsert,
  SupabaseTenantUpdate,
  SupabasePayment,
  SupabasePaymentInsert,
  SupabasePaymentUpdate,
  SupabaseMaintenanceRequest,
  SupabaseMaintenanceRequestInsert,
  SupabaseMaintenanceRequestUpdate,
  SupabaseDocument,
  SupabaseDocumentInsert,
  SupabaseDocumentUpdate,
  SupabaseAgreement,
  SupabaseAgreementInsert,
  SupabaseAgreementUpdate,
  SupabaseVendor,
  SupabaseVendorInsert,
  SupabaseVendorUpdate,
  SupabaseUserProfile,
  SupabaseUserProfileInsert,
  SupabaseUserProfileUpdate,
  SupabaseDashboardSummary
}; 