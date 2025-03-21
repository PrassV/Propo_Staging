import apiClient from '../client';
import { ApiResponse, Payment, PaymentCreate } from '../types';

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
  const response = await apiClient.get<ApiResponse<Payment[]>>('/payments', { params: filters });
  return response.data.data;
};

// Get a single payment by ID
export const getPaymentById = async (id: string): Promise<Payment> => {
  const response = await apiClient.get<ApiResponse<Payment>>(`/payments/${id}`);
  return response.data.data;
};

// Create a new payment
export const createPayment = async (paymentData: PaymentCreate): Promise<Payment> => {
  const response = await apiClient.post<ApiResponse<Payment>>('/payments', paymentData);
  return response.data.data;
};

// Update an existing payment
export const updatePayment = async (
  id: string,
  paymentData: Partial<Payment>
): Promise<Payment> => {
  const response = await apiClient.put<ApiResponse<Payment>>(`/payments/${id}`, paymentData);
  return response.data.data;
};

// Delete a payment
export const deletePayment = async (id: string): Promise<boolean> => {
  const response = await apiClient.delete(`/payments/${id}`);
  return response.status === 200;
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

  const response = await apiClient.post<ApiResponse<Payment>>(
    `/payments/${paymentId}/record`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  
  return response.data.data;
};

// Get payments due for a specific tenant
export const getPaymentsDueForTenant = async (tenantId: string): Promise<Payment[]> => {
  const response = await apiClient.get<ApiResponse<Payment[]>>(`/tenants/${tenantId}/payments/due`);
  return response.data.data;
};

// Get payment history for a property
export const getPaymentHistoryForProperty = async (propertyId: string): Promise<Payment[]> => {
  const response = await apiClient.get<ApiResponse<Payment[]>>(`/properties/${propertyId}/payments/history`);
  return response.data.data;
};

// Send payment reminder
export const sendPaymentReminder = async (paymentId: string): Promise<{ success: boolean }> => {
  const response = await apiClient.post<ApiResponse<{ success: boolean }>>(`/payments/${paymentId}/remind`);
  return response.data.data;
}; 