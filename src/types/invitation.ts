export interface InvitationVerificationResponse {
  success: boolean;
  data?: {
    id: string;
    token: string;
    tenant_email: string;
    tenant_name: string;
    tenant_phone?: string;
    property_id: string;
    owner_id: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    expires_at: string;
    created_at: string;
    updated_at?: string;
    rental_details?: Record<string, unknown>;
    message?: string;
    email_id?: string;
    email_status?: string;
    property?: {
      id: string;
      name: string;
      address_line1: string;
      city: string;
      state: string;
      property_type: string;
      owner?: {
        first_name: string;
        last_name: string;
        email: string;
        phone?: string;
      };
    };
  };
  error?: string;
}

export interface InvitationData {
  tenant_email: string;
  tenant_name: string;
  tenant_phone?: string;
  property_id: string;
  owner_id: string;
  rental_details?: Record<string, unknown>;
  message?: string;
}

export interface InvitationResponse {
  success: boolean;
  invitation_id?: string;
  token?: string;
  expires_at?: string;
  data?: Record<string, unknown>;
  error?: string;
}