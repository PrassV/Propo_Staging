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

// --- Document Interface (aligned with Backend Model) ---
export interface Document {
  id: string; // UUID
  owner_id: string; // UUID
  property_id?: string; // UUID
  tenant_id?: string; // UUID
  maintenance_request_id?: string; // UUID
  payment_id?: string; // UUID
  document_name: string;
  document_type?: DocumentType;
  file_url: string; // text (URL)
  file_path?: string; // text (path in storage bucket)
  file_extension?: string;
  mime_type?: string;
  file_size?: number; // bigint in backend, number here
  status?: DocumentStatus;
  version?: number;
  description?: string;
  created_at: string; // timestamp
  updated_at?: string; // timestamp
}

// --- Document Create Payload Type --- 
// Mirrors Backend DocumentCreate model
export interface DocumentCreate {
  document_name: string;
  file_url: string;
  property_id?: string; 
  tenant_id?: string;   
  maintenance_request_id?: string;
  payment_id?: string;
  document_type?: DocumentType;
  file_path?: string;
  file_extension?: string;
  mime_type?: string;
  file_size?: number;
  description?: string;
  // owner_id, id, status, created_at, version are set by backend
}

// --- Document Update Payload Type --- 
// Mirrors Backend DocumentUpdate model (optional fields)
export interface DocumentUpdate {
  document_name?: string;
  document_type?: DocumentType;
  description?: string;
  property_id?: string | null; // Allow setting to null
  tenant_id?: string | null;   // Allow setting to null
  maintenance_request_id?: string | null;
  payment_id?: string | null;
  // status is usually updated via specific actions (archive)
  // file_url/path/size/mime/extension usually updated via new version upload
}

// --- Document Response Type ---
// Matches the structure returned by API endpoints like create, getById, update
export interface DocumentResponse {
  document: Document;
  message?: string;
}

// --- Documents List Response Type ---
// Matches the structure returned by the getDocuments list endpoint
export interface DocumentsResponse {
  documents: Document[];
  count: number;
  message?: string;
} 