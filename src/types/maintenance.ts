export type MaintenancePriority = 'emergency' | 'urgent' | 'normal' | 'low';
export type MaintenanceCategory = 'plumbing' | 'electrical' | 'carpentry' | 'painting' | 'appliance' | 'other';
export type MaintenanceStatus = 'new' | 'in_review' | 'approved' | 'in_progress' | 'completed' | 'rejected';
export type ApprovalWorkflow = 'owner_assigned' | 'tenant_suggested' | 'tenant_handled';

export interface MaintenanceRequest {
  id: string;
  property_id: string;
  unit_id?: string;
  created_by: string;
  created_at: string;
  priority: MaintenancePriority;
  category: MaintenanceCategory;
  description: string;
  location: string;
  estimated_cost?: number;
  attachments?: string[];
  status: MaintenanceStatus;
  workflow_type: ApprovalWorkflow;
  assigned_vendor_id?: string;
  approved_by?: string;
  approved_at?: string;
  completed_at?: string;
}

export interface Vendor {
  id: string;
  name: string;
  categories: MaintenanceCategory[];
  phone: string;
  email: string;
  address: string;
  rating: number;
  license_number?: string;
  insurance_info?: string;
  documents?: string[];
  hourly_rate?: number;
}

export interface MaintenanceMessage {
  id: string;
  request_id: string;
  sender_id: string;
  sender_type: 'owner' | 'tenant' | 'vendor';
  message: string;
  attachments?: string[];
  created_at: string;
}