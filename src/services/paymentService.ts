import { supabase } from '../lib/supabase';

interface NotifyTenantParams {
  email: string;
  name: string;
  type: 'electricity' | 'tax';
  propertyId: string;
  unitNumber: string;
}

export async function notifyTenant(params: NotifyTenantParams) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/payments/notify-tenant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    return { success: true, data };
  } catch (error: unknown) {
    console.error('Error notifying tenant:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to notify tenant'
    };
  }
}

export async function getPaymentHistory(tenantId: string, type: 'rent' | 'electricity' | 'tax') {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/payments/history/${tenantId}?type=${type}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return { success: true, data };
  } catch (error: unknown) {
    console.error('Error fetching payment history:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch payment history'
    };
  }
}