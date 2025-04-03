import { useState, useEffect } from 'react';
import { formatCurrency } from '../../../utils/format';
import { formatDate } from '../../../utils/date';

import { getPaymentHistory } from '../../../api/services/paymentService';
import { Payment } from '../../../api/types';

interface PaymentHistoryProps {
  tenantId: string;
}

export default function PaymentHistory({ tenantId }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!tenantId) return;
      setLoading(true);
      setError(null);
      try {
        const fetchedPayments = await getPaymentHistory(tenantId, 'rent');
        setPayments(fetchedPayments || []);
      } catch (fetchError: unknown) {
        console.error("Error fetching payment history:", fetchError);
        const message = fetchError instanceof Error ? fetchError.message : "Failed to load payment history.";
        setError(message);
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, [tenantId]);

  if (loading) return <p>Loading payment history...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (payments.length === 0) return <p>No payment history found.</p>;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">Your Rent Payments</h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left">
              <th className="pb-3 text-sm font-medium text-gray-600">Type</th>
              <th className="pb-3 text-sm font-medium text-gray-600">Description</th>
              <th className="pb-3 text-sm font-medium text-gray-600">Due Date</th>
              <th className="pb-3 text-sm font-medium text-gray-600">Status</th>
              <th className="pb-3 text-sm font-medium text-gray-600">Amount</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-t">
                <td className="py-3 text-sm capitalize">{payment.payment_type}</td>
                <td className="py-3 text-sm">{payment.description || 'N/A'}</td>
                <td className="py-3 text-sm">{formatDate(payment.due_date)}</td>
                <td className="py-3 text-sm capitalize">{payment.status}</td>
                <td className="py-3 text-sm font-medium">{formatCurrency(payment.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}