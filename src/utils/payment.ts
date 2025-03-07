import { supabase } from '../lib/supabase';

interface PaymentPeriodParams {
  startDate: string;
  endDate: string;
  frequency: 'monthly' | 'quarterly' | 'half-yearly' | 'yearly' | 'one-time';
  rentAmount: number;
  maintenanceFee: number;
  type: 'rent' | 'lease';
}

export async function getPaymentStatus(tenantId: string, periodStart: string, periodEnd: string) {
  try {
    const { data, error } = await supabase
      .from('payment_history')
      .select('payment_status')
      .eq('tenant_id', tenantId)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .maybeSingle();

    if (error) throw error;
    return data?.payment_status || 'pending';
  } catch (error) {
    console.error('Error fetching payment status:', error);
    return 'pending';
  }
}

export function generatePaymentPeriods({
  startDate,
  endDate,
  frequency,
  rentAmount,
  maintenanceFee,
  type
}: PaymentPeriodParams) {
  const start = new Date(startDate);
  const end = new Date(); // Use current date as end date
  const periods = [];

  // For lease, return single payment period
  if (type === 'lease') {
    return [{
      startDate,
      endDate,
      dueDate: startDate,
      rentAmount,
      maintenanceFee,
      totalAmount: rentAmount + maintenanceFee
    }];
  }

  // For rental, generate periods based on frequency up to current date
  let currentDate = new Date(start);

  while (currentDate < end) {
    let periodEnd = new Date(currentDate);
    
    switch (frequency) {
      case 'monthly':
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        break;
      case 'quarterly':
        periodEnd.setMonth(periodEnd.getMonth() + 3);
        break;
      case 'half-yearly':
        periodEnd.setMonth(periodEnd.getMonth() + 6);
        break;
      case 'yearly':
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        break;
    }

    // Don't exceed current date
    if (periodEnd > end) {
      break;
    }

    periods.push({
      startDate: currentDate.toISOString().split('T')[0],
      endDate: periodEnd.toISOString().split('T')[0],
      dueDate: currentDate.toISOString().split('T')[0], // Due at start of period
      rentAmount,
      maintenanceFee,
      totalAmount: rentAmount + maintenanceFee
    });

    currentDate = new Date(periodEnd);
  }

  return periods;
}