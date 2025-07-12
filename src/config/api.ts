// API Configuration for all endpoints

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  // Property endpoints
  properties: {
    list: '/api/properties',
    details: '/api/properties', // /{property_id}
    create: '/api/properties',
    update: '/api/properties', // /{property_id}
    delete: '/api/properties', // /{property_id}
    documents: '/api/properties', // /{property_id}/documents
    revenue: '/api/properties', // /{property_id}/revenue
    financialSummary: '/api/properties', // /{property_id}/financial-summary
    taxes: '/api/properties', // /{property_id}/taxes
    details_by_lease: '/api/properties' // /{property_id}/details
  },
  
  // Unit endpoints
  units: {
    list: '/api/units',
    details: '/api/units', // /{unit_id}
    withLease: '/api/units', // /{unit_id}/with-lease
    create: '/api/units',
    update: '/api/units', // /{unit_id}
    delete: '/api/units', // /{unit_id}
    maintenance: '/api/units', // /{unit_id}/maintenance_requests
    tenants: '/api/units', // /{unit_id}/tenants
    payments: '/api/units', // /{unit_id}/payments
    amenities: '/api/units', // /{unit_id}/amenities
    taxes: '/api/units', // /{unit_id}/taxes
    history: '/api/units', // /{unit_id}/history
    terminateLease: '/api/units', // /{unit_id}/terminate_lease
    images: '/api/units' // /{unit_id}/images
  },
  
  // Lease endpoints
  leases: {
    list: '/api/leases',
    details: '/api/leases', // /{lease_id}
    create: '/api/leases',
    update: '/api/leases', // /{lease_id}
    delete: '/api/leases', // /{lease_id}
    terminate: '/api/leases', // /{lease_id}/terminate
    byUnit: '/api/leases/unit' // /{unit_id}
  },
  
  // Tenant endpoints
  tenants: {
    list: '/tenants/',
    details: '/tenants/', // /{tenant_id}
    create: '/tenants/',
    update: '/tenants/', // /{tenant_id}
    delete: '/tenants/', // /{tenant_id}
    properties: '/tenants/', // /{tenant_id}/properties
    payments: '/tenants/', // /{tenant_id}/payments
    maintenanceRequests: '/tenants/' // /{tenant_id}/maintenance_requests
  },
  
  // Maintenance endpoints
  maintenance: {
    list: '/api/maintenance',
    details: '/api/maintenance', // /{request_id}
    create: '/api/maintenance',
    update: '/api/maintenance', // /{request_id}
    delete: '/api/maintenance', // /{request_id}
    assign: '/api/maintenance', // /{request_id}/assign
    complete: '/api/maintenance' // /{request_id}/complete
  },
  
  // Payment endpoints
  payments: {
    list: '/api/payments',
    details: '/api/payments', // /{payment_id}
    create: '/api/payments',
    update: '/api/payments', // /{payment_id}
    delete: '/api/payments' // /{payment_id}
  },
  
  
  
  // Auth endpoints
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
    profile: '/api/auth/profile'
  }
};

export const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const buildUrl = (endpoint: string, params?: Record<string, string | number>) => {
  const url = new URL(endpoint, API_BASE_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }
  return url.toString();
}; 