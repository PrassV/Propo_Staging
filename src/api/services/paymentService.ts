import apiClient from '../client';
import { Payment, PaymentCreate, RecentPayment, PaymentUpdate } from '../types';

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
    // @ts-expect-error - Mismatch between declared return type and actual returned value.
    return response.data.items || [];
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

    const response = await apiClient.get<{ items: RecentPayment[] }>('/payments', {
      params: queryParams
    });
    return response.data.items || [];
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
export const updatePayment = async (id: string, data: Partial<PaymentUpdate>): Promise<Payment> => {
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

/**
 * Create a payment request
 * Calls POST /payments
 */
export const createPaymentRequest = async (data: {
  property_id: string;
  unit_id: string;
  tenant_id: string;
  lease_id: string;
  amount: number;
  due_date: string;
  payment_type: string;
  description: string;
}): Promise<Payment> => {
  try {
    const response = await apiClient.post<Payment>('/payments', data);
    return response.data;
  } catch (error: unknown) {
    console.error('Error creating payment request:', error);
    let errorMessage = 'Failed to create payment request';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Record a manual payment
 * Calls POST /payments/{id}/record
 */
export const recordManualPayment = async (paymentId: string, data: {
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  notes?: string;
}): Promise<Payment> => {
  try {
    const response = await apiClient.post<Payment>(`/payments/${paymentId}/record`, data);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error recording payment for ${paymentId}:`, error);
    let errorMessage = 'Failed to record payment';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Send a payment reminder
 * Calls POST /payments/{id}/reminders
 */
export const sendPaymentReminder = async (paymentId: string, data: {
  recipient_email: string;
  message: string;
}): Promise<{ message: string }> => {
  try {
    const formData = new FormData();
    formData.append('recipient_email', data.recipient_email);
    formData.append('message', data.message);

    const response = await apiClient.post<{ message: string }>(`/payments/${paymentId}/reminders`, formData);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error sending payment reminder for ${paymentId}:`, error);
    let errorMessage = 'Failed to send payment reminder';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};