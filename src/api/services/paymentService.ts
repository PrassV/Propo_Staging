import apiClient from '../client';
import { Payment, PaymentCreate, RecentPayment } from '../types';

/**
 * Get all payments with optional filters
 * Calls GET /payments
 */
export const getPayments = async (params: {
  property_id?: string;
  tenant_id?: string;
  unit_id?: string;
  status?: string;
  payment_method?: string;
  start_date?: string;
  end_date?: string;
  min_amount?: number;
  max_amount?: number;
  skip?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
} = {}): Promise<{ items: Payment[], total: number }> => {
  try {
    const response = await apiClient.get<{ items: Payment[], total: number }>('/payments', { params });
    return response.data;
  } catch (error: unknown) {
    console.error('Error fetching payments:', error);
    let errorMessage = 'Failed to fetch payments';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Get payments for a specific unit
 * Calls GET /payments endpoint with unit_id parameter
 */
export const getPaymentsByUnitId = async (unitId: string, params?: { tenantId?: string }): Promise<RecentPayment[]> => {
  try {
    const queryParams = {
      unit_id: unitId,
      tenant_id: params?.tenantId
    };
    
    const response = await apiClient.get<RecentPayment[]>('/payments', { 
      params: queryParams
    });
    return response.data;
  } catch (error: unknown) {
    console.error(`Error fetching payments for unit ${unitId}:`, error);
    let errorMessage = 'Failed to fetch payment history';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Get a specific payment by ID
 * Calls GET /payments/{id}
 */
export const getPaymentById = async (id: string): Promise<Payment> => {
  try {
    const response = await apiClient.get<Payment>(`/payments/${id}`);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error fetching payment ${id}:`, error);
    let errorMessage = 'Failed to fetch payment details';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Create a new payment
 * Calls POST /payments
 */
export const createPayment = async (data: PaymentCreate): Promise<Payment> => {
  try {
    const response = await apiClient.post<Payment>('/payments', data);
    return response.data;
  } catch (error: unknown) {
    console.error('Error creating payment:', error);
    let errorMessage = 'Failed to create payment';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Update a payment
 * Calls PUT /payments/{id}
 */
export const updatePayment = async (id: string, data: Partial<PaymentCreate>): Promise<Payment> => {
  try {
    const response = await apiClient.put<Payment>(`/payments/${id}`, data);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error updating payment ${id}:`, error);
    let errorMessage = 'Failed to update payment';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Delete a payment
 * Calls DELETE /payments/{id}
 */
export const deletePayment = async (id: string): Promise<{ message: string }> => {
  try {
    const response = await apiClient.delete<{ message: string }>(`/payments/${id}`);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error deleting payment ${id}:`, error);
    let errorMessage = 'Failed to delete payment';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Generate payment receipt
 * Calls GET /payments/{id}/receipt
 */
export const generateReceipt = async (id: string): Promise<{ receipt_url: string }> => {
  try {
    const response = await apiClient.get<{ receipt_url: string }>(`/payments/${id}/receipt`);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error generating receipt for payment ${id}:`, error);
    let errorMessage = 'Failed to generate receipt';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
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
    nextDueDate: string | null;
    nextDueAmount: number | null;
    lastPaymentDate: string | null;
    lastPaymentAmount: number | null;
    isOverdue: boolean;
}

/**
 * Fetches the recent payment status for a tenant.
 */
export const getTenantPaymentStatus = async (tenantId: string): Promise<RecentPaymentStatus> => {
    try {
        const response = await apiClient.get<RecentPaymentStatus>(`/tenants/${tenantId}/payment_status`);
        if (response.data) {
            return response.data;
        } else {
            throw new Error('Invalid response structure from payment status endpoint.');
        }
    } catch (error: unknown) {
       // ... existing refined error handling ...
       console.error(`Error fetching payment status for tenant ${tenantId}:`, error);
       let errorMessage = 'Failed to fetch payment status';
       if (error && typeof error === 'object' && 'response' in error && 
           error.response && typeof error.response === 'object' && 'data' in error.response &&
           error.response.data && typeof error.response.data === 'object' && 'detail' in error.response.data) {
            errorMessage = (error.response.data as { detail: string }).detail;
       } else if (error instanceof Error) {
            errorMessage = error.message;
       }
       throw new Error(errorMessage);
    }
};

/*
// Interface remains the same
interface NotifyTenantParams { 
    email: string;
    name: string;
    type: 'electricity' | 'tax';
    propertyId: string;
    unitNumber: string;
}

// TODO: Refactor notifyTenant if it needs to call a backend API or remove if unused
export async function notifyTenant(_params: NotifyTenantParams): Promise<{ success: boolean, data?: unknown, error?: string }> {
    console.warn("notifyTenant function needs refactoring or removal.");
    // Placeholder return
    return { success: false, error: "Function not implemented" };
}
*/

/**
 * Fetches payment history for a tenant.
 */
export async function getPaymentHistory(tenantId: string, type: 'rent') : Promise<Payment[]> {
  try {
    const endpoint = '/payments'; // Use const
    const params: Record<string, string> = { 
      tenant_id: tenantId,
      sort_by: 'period_start', 
      sort_order: 'desc' 
    };

    switch (type) {
      case 'rent':
        break;
      // Other cases removed/commented out
      default:
         // Should not happen with current type signature, but good practice
         throw new Error(`Unsupported payment history type: ${type}`);
    }

    const response = await apiClient.get<Payment[]>(endpoint, { params });
    return response.data || []; 

  } catch (error: unknown) {
    // ... existing refined error handling ...
    console.error('Error fetching payment history:', error);
    let errorMessage = 'Failed to fetch payment history';
    if (error && typeof error === 'object' && 'response' in error && 
        error.response && typeof error.response === 'object' && 'data' in error.response &&
        error.response.data && typeof error.response.data === 'object' && 'detail' in error.response.data) {
         errorMessage = (error.response.data as { detail: string }).detail;
    } else if (error instanceof Error) {
         errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
}

// TODO: Add other payment service functions (record payment, getById) as needed 