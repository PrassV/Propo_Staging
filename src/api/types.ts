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
  first_name?: string;
  last_name?: string;
  phone?: string;
  user_type: 'owner' | 'tenant' | 'admin';
  created_at: string;
  updated_at: string;
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
  zip_code: string;
  country: string;
  description?: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  area_unit?: string;
  year_built?: number;
  owner_id: string;
  image_url?: string;
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
  zip_code: string;
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
  zip_code?: string;
  country?: string;
  description?: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  area_unit?: string;
  year_built?: number;
  image_url?: string;
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
  total_properties: number;
  total_tenants: number;
  occupied_units: number;
  vacant_units: number;
  total_revenue: number;
  pending_rent: number;
  maintenance_requests: number;
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

// Maintenance types
export interface MaintenanceRequest {
  id: string;
  property_id: string;
  tenant_id?: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'emergency';
  category: string;
  images?: string[]; // Assuming backend provides image URLs
  assigned_to?: string; // Might be vendor_id from backend
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRequestCreate {
  property_id: string;
  tenant_id?: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  category: string;
  // Frontend might add image URLs here after uploading them separately
}

export interface MaintenanceRequestUpdate {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'emergency';
  category?: string;
  assigned_to?: string; // Might be vendor_id from backend
  // Frontend might add/remove image URLs here
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

// Document types (matching backend models/responses)
export interface Document {
  id: string;
  title: string;
  description?: string;
  owner_id: string;
  property_id?: string;
  tenant_id?: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  document_type: string; // Use string or define frontend enum matching backend
  access_level: string; // Use string or define frontend enum matching backend
  status: string; // Use string or define frontend enum matching backend
  tags?: string[];
  created_at: string; // Use string for dates from API
  updated_at: string;
}

export interface DocumentCreate {
  title: string;
  description?: string;
  property_id?: string;
  tenant_id?: string;
  maintenance_request_id?: string;
  payment_id?: string;
  file_url: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  document_type?: string; // Use string or define frontend enum matching backend
  access_level?: string; // Use string or define frontend enum matching backend
  tags?: string[];
}

export interface DocumentUpdate {
  title?: string;
  description?: string;
  property_id?: string;
  tenant_id?: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  document_type?: string; // Use string or define frontend enum matching backend
  access_level?: string; // Use string or define frontend enum matching backend
  tags?: string[];
}

// Backend response structure for single document
export interface DocumentResponse {
  document: Document;
  message: string;
}

// Backend response structure for document list
export interface DocumentsResponse {
  documents: Document[];
  count: number;
  message: string;
}

// Type for updating user profile
export interface UserUpdate {
  first_name?: string;
  last_name?: string;
  phone?: string;
  // Add other updatable fields matching backend model
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