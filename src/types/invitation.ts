```typescript
export interface InvitationData {
  id: string;
  property: {
    id: string;
    property_name: string;
    address_line1: string;
    city: string;
    state: string;
    property_type: string;
    owner: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
    };
  };
  tenant: {
    id: string;
    name: string;
    email: string;
    phone: string;
    rental_type: 'rent' | 'lease';
    rental_amount?: number;
    maintenance_fee?: number;
    rental_frequency?: string;
    rental_start_date?: string;
    rental_end_date?: string;
  };
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  created_at: string;
  updated_at: string;
}
```