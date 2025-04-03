import React, { useState, useEffect } from 'react';
import { RecentPayment } from '@/api/types';
import { api } from '@/api/apiClient'; // Use actual api client
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PaymentListTabProps {
  unitId: string;
  tenantId?: string | null; // Optional tenant ID for filtering
}

export default function PaymentListTab({ unitId, tenantId }: PaymentListTabProps) {
  const [payments, setPayments] = useState<RecentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!unitId) return;
      setLoading(true); setError(null);
      try {
        // Use actual API call
        const params: { tenantId?: string } = {};
        if (tenantId) {
            params.tenantId = tenantId;
        }
        const data = await api.payment.getPaymentsByUnitId(unitId, params); 
        setPayments(data || []); // API service returns RecentPayment[]
      } catch (err) {
        console.error("Error fetching payments:", err); 
        setError(err instanceof Error ? err.message : 'Failed to load payments.');
        setPayments([]); // Clear on error
      } finally { setLoading(false); }
    };
    fetchPayments();
  }, [unitId, tenantId]);

   const getStatusVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
        status = status.toLowerCase();
        if (status.includes('completed') || status.includes('paid')) return 'default'; // Use default (primary) for success
        if (status.includes('pending') || status.includes('processing')) return 'secondary'; // Keep secondary for pending
        if (status.includes('failed') || status.includes('overdue')) return 'destructive';
        return 'secondary';
    };

  if (loading) return <LoadingSpinner />;
  if (error) return <p className="text-sm text-destructive">Error: {error}</p>;

  return (
    <div className="space-y-3">
      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payments found for this unit.</p>
      ) : (
        payments.map(pay => (
            <Card key={pay.id} className="p-3">
                 <div className="flex justify-between items-start gap-2">
                     <div>
                         <p className="font-medium">${pay.amount.toFixed(2)}</p>
                         <p className="text-xs text-muted-foreground">
                            Paid: {new Date(pay.payment_date).toLocaleDateString()}
                         </p>
                     </div>
                     <Badge variant={getStatusVariant(pay.status)} className="text-xs">{pay.status}</Badge>
                 </div>
            </Card>
        ))
      )}
       {/* TODO: Add 'Record Payment' Button */} 
    </div>
  );
} 