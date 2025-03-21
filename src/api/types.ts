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