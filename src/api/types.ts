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

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  user_type?: 'owner' | 'tenant' | 'admin' | null;
  role?: 'owner' | 'tenant' | 'admin' | null;
  created_at?: string;
  updated_at?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
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

// Property types
export interface Property {
  id: string;
  property_name: string;
  property_type: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  description?: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number | null;
  area_unit?: string;
  year_built?: number | null;
  owner_id: string;
  image_url?: string;
  status: 'Rented' | 'Vacant' | 'For Sale' | 'Unknown';
  created_at: string;
  updated_at: string;
  tenants?: Tenant[];
}

export interface PropertyCreate {
  property_name: string;
  property_type: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  description?: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  area_unit?: string;
  year_built?: number;
  image_url?: string;
}

export interface PropertyUpdate {
  property_name?: string;
  property_type?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  description?: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  area_unit?: string;
  year_built?: number;
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
  description: string;
  numberOfUnits?: number; // From BasicDetails?
  category: string;
  listedIn: string;
  status: string;
  price: number;
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

// Represents the detailed data for a single Unit within a Property
export interface UnitDetails {
  id: string;
  property_id: string;
  unit_number: string;
  status: 'Occupied' | 'Vacant' | 'Under Maintenance' | string;
  current_tenant_id: string | null;
  current_lease_id: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  rent: number | null;
  deposit: number | null;
  // Add any other relevant unit details from API
}

// Represents the detailed data returned for a single property view
export interface PropertyDetails extends Property {
  image_urls: string[];
  units: UnitDetails[];
  documents: Document[];
  description?: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number | null;
  year_built?: number | null;
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

// Tenant types
export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  tenant_type?: 'individual' | 'company';
  move_in_date?: string;
  lease_end_date?: string;
  rent_amount?: number;
  rent_frequency?: 'monthly' | 'quarterly' | 'annually';
  property_id: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TenantCreate {
  name: string;
  email: string;
  phone?: string;
  tenant_type?: 'individual' | 'company';
  move_in_date?: string;
  lease_end_date?: string;
  rent_amount?: number;
  rent_frequency?: 'monthly' | 'quarterly' | 'annually';
  property_id: string;
}

export interface TenantUpdate {
  name?: string;
  email?: string;
  phone?: string;
  tenant_type?: 'individual' | 'company';
  move_in_date?: string;
  lease_end_date?: string;
  rent_amount?: number;
  rent_frequency?: 'monthly' | 'quarterly' | 'annually';
}

// Dashboard types
export interface DashboardSummary {
  // Owner Dashboard Fields
  total_properties: number;
  total_tenants: number;
  occupied_units: number;
  vacant_units: number;
  total_revenue: number;
  pending_rent: number;
  maintenance_requests: number;
  
  // Tenant Dashboard Fields
  next_due_date?: string;
  next_due_amount?: number;
  lease_end?: string;
}

// Payment record in dashboard
export interface RecentPayment {
  id: string;
  amount: number;
  payment_date: string;
  status: string;
  tenant_name: string;
  property_name: string;
}

// Maintenance issue in dashboard
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

// Backend response structure for single tenant
export interface TenantResponse {
  tenant: Tenant;
  message: string;
}

// Backend response structure for tenant list
export interface TenantsListResponse {
  items: Tenant[];
  total: number;
  message: string;
}

// Backend response structure for tenant invitation (based on backend code)
export interface TenantInvitationResponse {
    invitation: TenantInvitation; // TenantInvitation is already defined
    message: string;
}

// Tenant Invitation types
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

// Payment types
export interface Payment {
  id: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_type: 'rent' | 'deposit' | 'maintenance' | 'other';
  description?: string;
  property_id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentCreate {
  amount: number;
  due_date: string;
  payment_type: 'rent' | 'deposit' | 'maintenance' | 'other';
  description?: string;
  property_id: string;
  tenant_id: string;
}

export interface PaymentUpdate {
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled';
  // Add other updatable fields if needed, e.g., description
  description?: string;
  // Note: payment_date is NOT part of the Payment model, so cannot be updated here
}

// Define Maintenance Status Type
export type MaintenanceStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

// Define Maintenance Priority Type
export type MaintenancePriority = 'low' | 'medium' | 'high' | 'emergency';

// Define Maintenance Category Type (add more specific categories as needed)
export type MaintenanceCategory = 
    'plumbing' | 'electrical' | 'hvac' | 'appliances' | 
    'painting' | 'carpentry' | 'landscaping' | 'cleaning' | 
    'pest_control' | 'roofing' | 'general' | 'other';

// Maintenance Request Types
export interface MaintenanceRequest {
  id: string;
  property_id: string;
  tenant_id?: string;
  title: string;
  description: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority; // Use the defined type
  category: MaintenanceCategory; // Use the defined type
  images?: string[];
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRequestCreate {
  property_id: string;
  tenant_id?: string;
  title: string;
  description: string;
  priority: MaintenancePriority; // Use the defined type
  category: MaintenanceCategory; // Use the defined type
  // images?: string[]; // Add if API expects image URLs during creation
}

export interface MaintenanceRequestUpdate {
  title?: string;
  description?: string;
  status?: MaintenanceStatus;
  priority?: MaintenancePriority; // Use the defined type
  category?: MaintenanceCategory; // Use the defined type
  assigned_to?: string; 
}

// Add other related types if needed, e.g., for Comments, Vendors etc. 

// Rent Estimation types
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

// ############# DOCUMENT TYPES START #############

// Matches backend DocumentType enum
export type DocumentType = 
    'lease_agreement' | 
    'id_proof' | 
    'payment_receipt' | 
    'maintenance_invoice' | 
    'maintenance_photo' | 
    'property_photo' | 
    'other';

// Matches backend DocumentStatus enum
export type DocumentStatus = 'active' | 'archived' | 'pending_review';

// Matches backend DocumentAccess enum
export type DocumentAccess = 'private' | 'shared_link' | 'shared_user';

// Document types (Consolidated Definition)
export interface Document {
  id: string;
  title: string;
  description?: string;
  owner_id: string;
  property_id?: string;
  tenant_id?: string;
  maintenance_request_id?: string; // Added missing from first def
  payment_id?: string; // Added missing from first def
  file_url: string;
  file_name: string; // Renamed from document_name for consistency?
  file_type: string; // Changed from mime_type? Check backend
  file_path?: string; // Added
  file_extension?: string; // Added
  file_size?: number;
  document_type?: DocumentType; // Use specific type
  access_level: DocumentAccess; // Use specific type, make non-optional?
  status?: DocumentStatus; // Use specific type, optional
  tags?: string[];
  version?: number; // Added
  created_at: string; 
  updated_at?: string; // Make optional
}

// --- Document Create Payload Type --- 
// Aligned with DB schema + necessary frontend fields
export interface DocumentCreate {
  document_name: string; // Required by DB (use original filename)
  file_url: string; // Required by DB
  property_id?: string; 
  tenant_id?: string;   
  maintenance_request_id?: string;
  payment_id?: string;
  document_type?: DocumentType;
  mime_type?: string; // Use mime_type (from fileInfo.fileType)
  file_extension?: string;
  file_size?: number;
  description?: string;
  title?: string; // Optional: Keep for potential display differentiation
  file_name?: string; // Optional: Keep original filename if different from document_name
  file_path?: string; // Optional: Keep path if needed by frontend/backend logic
  access_level?: DocumentAccess; // Keep, assuming DB will be updated
  tags?: string[]; // Keep, assuming DB will be updated
}

export interface DocumentUpdate {
  title?: string; // Changed from document_name
  description?: string;
  document_type?: DocumentType;
  property_id?: string | null; 
  tenant_id?: string | null;   
  maintenance_request_id?: string | null;
  payment_id?: string | null;
  access_level?: DocumentAccess;
  tags?: string[];
}

// Backend response structure for single document
export interface DocumentResponse {
  document: Document;
  message?: string;
}

// Backend response structure for document list
export interface DocumentsResponse {
  documents: Document[];
  count: number;
  message?: string;
}

// ############# DOCUMENT TYPES END #############

// Type for updating user profile
export interface UserUpdate {
  first_name?: string;
  last_name?: string;
  phone?: string;
  // Can add other fields users are allowed to update
}

// Upload response type
export interface UploadResponse {
  message: string;
  imageUrls?: string[];
  fileUrl?: string; // For single file uploads
}

// Reporting types (Define based on backend models)
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

// Backend response structures
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

// Notification types
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

// Backend response structures
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

// Agreement types
export interface Agreement {
  id: string;
  owner_id: string;
  tenant_id: string;
  property_id: string;
  agreement_type: string; // e.g., 'lease', 'rental'
  status: string; // e.g., 'draft', 'pending_tenant', 'pending_landlord', 'signed', 'expired'
  start_date: string;
  end_date: string;
  rent_amount: number;
  rent_frequency: string;
  deposit_amount?: number;
  terms?: string;
  document_url?: string; // Link to the generated/signed document
  created_at: string;
  updated_at: string;
}

export interface AgreementCreate {
  tenant_id: string;
  property_id: string;
  agreement_type: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  rent_frequency: string;
  deposit_amount?: number;
  terms?: string;
  template_id?: string; // Optional template to use
}

export interface AgreementUpdate {
  status?: string;
  start_date?: string;
  end_date?: string;
  rent_amount?: number;
  rent_frequency?: string;
  deposit_amount?: number;
  terms?: string;
  document_url?: string;
}

export interface AgreementTemplate {
  id: string;
  name: string;
  agreement_type: string;
  content: string; // Template content (e.g., HTML, markdown)
  created_at: string;
  updated_at: string;
}

// Backend response structures (assuming most return the model directly)
// Add specific response types if backend wraps them (like for delete) 

// Vendor types
export interface Vendor {
  id: string;
  owner_id: string;
  company_name: string;
  contact_name?: string;
  email: string;
  phone?: string;
  category: string; // e.g., 'plumbing', 'electrical', 'hvac'
  status: string; // e.g., 'active', 'inactive', 'pending'
  rating?: number;
  completed_jobs?: number;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface VendorCreate {
  company_name: string;
  contact_name?: string;
  email: string;
  phone?: string;
  category: string;
  address?: string;
}

export interface VendorUpdate {
  company_name?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  category?: string;
  status?: string;
  address?: string;
}

// Add specific response types if needed, e.g., for stats or jobs 

// Lease Agreement Type
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

// Maintenance Comment Type (Add if missing)
export interface MaintenanceComment {
    id: string;
    request_id: string;
    user_id: string;
    user_name: string; // Denormalized?
    comment: string;
    created_at: string;
    // Add other fields like attachments if supported
}

// Add UnitCreate Type
export interface UnitCreate {
    unit_number?: string;
    status?: 'Occupied' | 'Vacant' | 'Under Maintenance' | string;
    bedrooms?: number | null;
    bathrooms?: number | null;
    area_sqft?: number | null;
    rent?: number | null;
    deposit?: number | null;
    // Add other fields required/allowed for creating a unit
}

// Add UnitResponse Type (adjust based on actual API response)
export interface UnitResponse {
    unit: UnitDetails;
    message?: string;
}

// Interface for Rent Agreement Form Data
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

// Interface for the response from the agreement generation utility/API
export interface AgreementGenerationResponse {
    agreement: string; // The generated agreement text
    success?: boolean; // Optional success flag
    // Add other potential response fields from the API
} 