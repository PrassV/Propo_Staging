import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import toast from 'react-hot-toast';
import api from '@/api';
import { Payment, PaymentUpdate } from '@/api/types';

interface EditPaymentModalProps {
  payment: Payment;
  onClose: () => void;
  onSave: () => void;
}

export default function EditPaymentModal({
  payment,
  onClose,
  onSave
}: EditPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(payment.status);

  useEffect(() => {
    setPaymentStatus(payment.status);
  }, [payment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData: PaymentUpdate = {
        status: paymentStatus,
      };

      await api.payment.updatePayment(payment.id, updateData);

      toast.success('Payment status updated successfully');
      onSave();
    } catch (error: unknown) {
      console.error('Error updating payment:', error);
      const message = error instanceof Error ? error.message : 'Failed to update payment';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Update Payment Status</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <p className="text-lg font-medium">
              {new Date(payment.due_date).toLocaleDateString()}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <p className="text-lg font-medium">{formatCurrency(payment.amount)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <p className="text-base capitalize">{payment.payment_type}</p>
          </div>

          {payment.description && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <p className="text-sm text-gray-600">{payment.description}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Status
            </label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as Payment['status'])}
              className="w-full p-2 border rounded-lg"
              required
              disabled={loading}
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}