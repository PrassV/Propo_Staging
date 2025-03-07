import { useState } from 'react';
import { formatCurrency } from '../../../utils/format';

interface Payment {
  id: string;
  plan: 'Card' | 'Mobile';
  reason: string;
  date: string;
  amount: number;
}

interface PaymentHistoryProps {
  tenantData: any;
}

export default function PaymentHistory({ tenantData }: PaymentHistoryProps) {
  const [payments] = useState<Payment[]>([
    {
      id: '1',
      plan: 'Card',
      reason: 'Rent',
      date: '2022-12-28',
      amount: 10000
    },
    {
      id: '2',
      plan: 'Mobile',
      reason: 'WiFi subscription',
      date: '2022-12-28',
      amount: 3500
    }
  ]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">Your Payments</h2>
      <p className="text-sm text-gray-600 mb-4">Payment made in the last 12 months</p>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left">
              <th className="pb-3 text-sm font-medium text-gray-600">Payment Plan</th>
              <th className="pb-3 text-sm font-medium text-gray-600">Reason</th>
              <th className="pb-3 text-sm font-medium text-gray-600">Date</th>
              <th className="pb-3 text-sm font-medium text-gray-600">Amount</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-t">
                <td className="py-3 text-sm">{payment.plan}</td>
                <td className="py-3 text-sm">{payment.reason}</td>
                <td className="py-3 text-sm">{new Date(payment.date).toLocaleDateString()}</td>
                <td className="py-3 text-sm font-medium">{formatCurrency(payment.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}