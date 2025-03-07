import { useState, useEffect } from 'react';
import { Edit2, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/format';
import { formatDate } from '../../utils/date';
import { useDataCache } from '../../hooks/useDataCache';
import toast from 'react-hot-toast';

interface PaymentDetailsTableProps {
  propertyId: string;
  tenantId: string;
  unitNumber: string;
  type?: 'rent' | 'electricity' | 'tax';
}

export default function PaymentDetailsTable({ 
  propertyId, 
  tenantId, 
  unitNumber,
  type = 'rent'
}: PaymentDetailsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const cacheKey = `payments-${propertyId}-${tenantId}-${type}-${currentPage}`;
  const { data: payments, loading, error } = useDataCache(cacheKey, async () => {
    // Get date range (6 months past to 3 months future)
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 6);
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 3);

    const { from, to } = {
      from: (currentPage - 1) * ITEMS_PER_PAGE,
      to: currentPage * ITEMS_PER_PAGE - 1
    };

    let query;
    switch (type) {
      case 'rent':
        query = supabase
          .from('payment_history')
          .select('*', { count: 'exact' })
          .eq('tenant_id', tenantId)
          .gte('period_start', pastDate.toISOString())
          .lte('period_end', futureDate.toISOString())
          .order('period_start', { ascending: false })
          .range(from, to);
        break;

      case 'electricity':
        query = supabase
          .from('electricity_payments')
          .select('*', { count: 'exact' })
          .eq('property_tenant_id', tenantId)
          .gte('bill_period', pastDate.toISOString().split('T')[0])
          .lte('bill_period', futureDate.toISOString().split('T')[0])
          .order('bill_period', { ascending: false })
          .range(from, to);
        break;

      case 'tax':
        query = supabase
          .from('tax_payments')
          .select('*', { count: 'exact' })
          .eq('property_id', propertyId)
          .gte('due_date', pastDate.toISOString())
          .lte('due_date', futureDate.toISOString())
          .order('due_date', { ascending: false })
          .range(from, to);
        break;
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  });

  if (error) {
    toast.error('Failed to fetch payments');
    return <div className="text-center py-4 text-red-600">Error loading payments</div>;
  }

  if (loading) {
    return <div className="text-center py-4">Loading payments...</div>;
  }

  if (!payments || payments.length === 0) {
    return <div className="text-center py-4 text-gray-600">No payment records found</div>;
  }

  // Rest of the component remains the same...
  // (Keep existing table rendering code)
}