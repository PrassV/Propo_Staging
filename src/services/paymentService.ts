// Import apiClient
import apiClient from '../client';

// Import necessary types (assuming they exist in ../types)
import { Payment, PaymentStatus } from '../types'; // Example types

interface NotifyTenantParams {
  email: string;
  name: string;
  type: 'electricity' | 'tax';
  propertyId: string;
  unitNumber: string;
}


export async function notifyTenant(params: NotifyTenantParams) {
  try {
    const { data, error } = await supabase.functions.invoke('notify-tenant', {
      body: params
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Error notifying tenant:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to notify tenant'
    };
  }
}

/**
 * Fetches payment history for a tenant.
 * Currently only supports 'rent' type via the backend API.
 * 
 * @param tenantId The ID of the tenant.
 * @param type The type of payment history ('rent' currently supported).
 * @returns An array of Payment objects.
 * @throws An error if fetching fails.
 */
export async function getPaymentHistory(tenantId: string, type: 'rent' /*| 'electricity' | 'tax'*/) : Promise<Payment[]> {
  try {
    let endpoint = '/payments';
    const params: Record<string, string> = { 
      tenant_id: tenantId,
      // Default sorting similar to original logic
      sort_by: 'period_start', 
      sort_order: 'desc' 
    };

    switch (type) {
      case 'rent':
        // Endpoint and params are set for rent payments
        // No specific filter needed if /payments defaults to rent or includes all types
        // If backend requires filtering by type: params.payment_type = 'rent';
        break;

      // TODO: Implement electricity and tax fetching when backend endpoints are available
      // case 'electricity':
      //   // endpoint = '/payments/electricity'; // Example future endpoint
      //   // params.sort_by = 'bill_period'; 
      //   throw new Error('Electricity payment history fetching not yet implemented.');
      // case 'tax':
      //   // endpoint = '/payments/tax'; // Example future endpoint
      //   // params.sort_by = 'due_date'; 
      //   throw new Error('Tax payment history fetching not yet implemented.');
      default:
         throw new Error(`Unsupported payment history type: ${type}`);
    }

    // Use apiClient to fetch data
    const response = await apiClient.get<Payment[]>(endpoint, { params });
    
    // apiClient likely throws on non-2xx responses, so direct error check might not be needed
    // Return the data array directly
    return response.data || []; 

  } catch (error: unknown) {
    console.error('Error fetching payment history:', error);
    // Refined error handling
    let errorMessage = 'Failed to fetch payment history';
    if (error && typeof error === 'object' && 'response' in error && 
        error.response && typeof error.response === 'object' && 'data' in error.response &&
        error.response.data && typeof error.response.data === 'object' && 'detail' in error.response.data) {
         errorMessage = (error.response.data as { detail: string }).detail;
    } else if (error instanceof Error) {
         errorMessage = error.message;
    }
    // Re-throw the error for the calling component to handle
    throw new Error(errorMessage);
  }
}

// Define RecentPaymentStatus based on usage in TenantDashboard
// Corresponds to backend GET /tenants/{id}/payment_status endpoint response
export interface RecentPaymentStatus {
    nextDueDate: Optional<string>;
    nextDueAmount: Optional<number>;
    lastPaymentDate: Optional<string>;
    lastPaymentAmount: Optional<number>;
    isOverdue: boolean;
}

/**
 * Fetches the recent payment status for a tenant.
 * Calls GET /tenants/{tenantId}/payment_status
 * 
 * @param tenantId The ID of the tenant.
 * @returns The recent payment status.
 * @throws An error if fetching fails.
 */
export const getTenantPaymentStatus = async (tenantId: string): Promise<RecentPaymentStatus> => {
    try {
        const response = await apiClient.get<RecentPaymentStatus>(`/tenants/${tenantId}/payment_status`);
        // Assuming the backend directly returns the RecentPaymentStatus structure
        if (response.data) {
            return response.data;
        } else {
            throw new Error('Invalid response structure from payment status endpoint.');
        }
    } catch (error: unknown) {
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