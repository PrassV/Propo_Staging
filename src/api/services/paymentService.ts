import apiClient from '../client';
import { Payment, PaymentCreate } from '../types';

// Get all payments with optional filters
export const getPayments = async (
  filters?: {
    property_id?: string;
    tenant_id?: string;
    status?: string;
    payment_type?: string;
    start_date?: string;
    end_date?: string;
  }
): Promise<Payment[]> => {
  const response = await apiClient.get<Payment[]>('/payments', { params: filters });
  return response.data;
};

// Get a single payment by ID
export const getPaymentById = async (id: string): Promise<Payment> => {
  const response = await apiClient.get<Payment>(`/payments/${id}`);
  return response.data;
};

// Create a new payment
export const createPayment = async (paymentData: PaymentCreate): Promise<Payment> => {
  const response = await apiClient.post<Payment>('/payments', paymentData);
  return response.data;
};

// Update an existing payment
export const updatePayment = async (
  id: string,
  paymentData: Partial<Payment>
): Promise<Payment> => {
  const response = await apiClient.put<Payment>(`/payments/${id}`, paymentData);
  return response.data;
};

// Delete a payment
export const deletePayment = async (id: string): Promise<void> => {
  await apiClient.delete(`/payments/${id}`);
};

// Record a payment
export const recordPayment = async (
  paymentId: string,
  data: {
    amount: number;
    payment_method: string;
    receipt_url?: string;
  }
): Promise<Payment> => {
  const formData = new FormData();
  formData.append('amount', data.amount.toString());
  formData.append('payment_method', data.payment_method);
  if (data.receipt_url) {
    formData.append('receipt_url', data.receipt_url);
  }

  const response = await apiClient.post<Payment>(
    `/payments/${paymentId}/record`,
    formData,
    {
      // Headers might not be needed if backend correctly parses FormData as Form fields
      // headers: {
      //   'Content-Type': 'multipart/form-data', 
      // },
    }
  );
  
  return response.data;
};

/*
// TODO: Remove or adapt this function. Endpoint `/tenants/{tenantId}/payments/due` does not exist.
// Get payments due for a specific tenant
export const getPaymentsDueForTenant = async (tenantId: string): Promise<Payment[]> => {
  const response = await apiClient.get<Payment[]>(`/tenants/${tenantId}/payments/due`);
  return response.data;
};
*/

/*
// TODO: Remove or adapt this function. Endpoint `/properties/{propertyId}/payments/history` does not exist.
// Get payment history for a property
export const getPaymentHistoryForProperty = async (propertyId: string): Promise<Payment[]> => {
  const response = await apiClient.get<Payment[]>(`/properties/${propertyId}/payments/history`);
  return response.data;
};
*/

/*
// TODO: Fix this function based on backend implementation.
// 1. Endpoint mismatch: Should be `/payments/{paymentId}/reminders` (plural).
// 2. Request data missing: Backend expects Form data (`recipient_email`, `message`).
// 3. Response handling: Backend returns `dict`, not `{ success: boolean }`.

// Send payment reminder
export const sendPaymentReminder = async (paymentId: string): Promise<{ success: boolean }> => {
  // Needs recipient_email and message in request body/form data
  const response = await apiClient.post<{ message: string }>( // Adjust expected response type
    `/payments/${paymentId}/remind`, // Fix endpoint path
    // Add form data here, e.g.:
    // { recipient_email: '...', message: '...' }
    );
  // Handle the actual response message if needed
  return { success: response.status === 200 }; // Or parse response.data.message
};
*/

// Placeholder type - adjust based on actual data
export interface RecentPaymentStatus {
    nextDueDate?: string;
    nextDueAmount?: number;
    lastPaymentDate?: string;
    lastPaymentAmount?: number;
    isOverdue?: boolean;
}

/**
 * Get recent payment status for a specific tenant by calling the backend.
 */
export const getTenantPaymentStatus = async (tenantId: string): Promise<RecentPaymentStatus> => {
    // console.warn(`getTenantPaymentStatus for ${tenantId} called - using mock data`);
    // TODO: Ensure backend endpoint GET /tenants/{tenant_id}/payment_status exists and returns RecentPaymentStatus
    try {
        const response = await apiClient.get<RecentPaymentStatus>(`/tenants/${tenantId}/payment_status`);
        return response.data;
    } catch (error: unknown) {
        console.error(`Error fetching payment status for tenant ${tenantId}:`, error);
        // Return empty object or rethrow, depending on how UI should handle failure
        // throw error; 
        return {}; // Return empty object for now
    }
}; 