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

export async function getPaymentHistory(tenantId: string, type: 'rent' | 'electricity' | 'tax') {
  try {
    let query;
    
    switch (type) {
      case 'rent':
        query = supabase
          .from('payment_history')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('period_start', { ascending: false });
        break;

      case 'electricity':
        query = supabase
          .from('electricity_payments')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('bill_period', { ascending: false });
        break;

      case 'tax':
        query = supabase
          .from('tax_payments')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('due_date', { ascending: false });
        break;
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error fetching payment history:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to fetch payment history'
    };
  }
}