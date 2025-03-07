import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/format';
import toast from 'react-hot-toast';

interface EditPaymentModalProps {
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  rentAmount: number;
  maintenanceAmount: number;
  status: 'pending' | 'paid';
  onClose: () => void;
  onSave: () => void;
}

export default function EditPaymentModal({
  tenantId,
  periodStart,
  periodEnd,
  rentAmount,
  maintenanceAmount,
  status,
  onClose,
  onSave
}: EditPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(status);
  const [paymentDate, setPaymentDate] = useState(
    status === 'paid' ? new Date().toISOString().split('T')[0] : ''
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First check if a record exists
      const { data: existingPayment } = await supabase
        .from('payment_history')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('period_start', periodStart)
        .eq('period_end', periodEnd)
        .maybeSingle();

      if (existingPayment) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('payment_history')
          .update({
            payment_status: paymentStatus,
            payment_date: paymentStatus === 'paid' ? paymentDate : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPayment.id);

        if (updateError) throw updateError;
      } else {
        // Create new record
        const { error: insertError } = await supabase
          .from('payment_history')
          .insert({
            tenant_id: tenantId,
            period_start: periodStart,
            period_end: periodEnd,
            rent_amount: rentAmount,
            maintenance_amount: maintenanceAmount,
            payment_status: paymentStatus,
            payment_date: paymentStatus === 'paid' ? paymentDate : null
          });

        if (insertError) throw insertError;
      }

      toast.success('Payment status updated successfully');
      onSave();
    } catch (error: any) {
      console.error('Error updating payment:', error);
      toast.error(error.message || 'Failed to update payment');
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
              Period
            </label>
            <p className="text-lg font-medium">
              {new Date(periodStart).toLocaleDateString()} - {new Date(periodEnd).toLocaleDateString()}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Amount
            </label>
            <p className="text-lg font-medium">{formatCurrency(rentAmount + maintenanceAmount)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Status
            </label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as 'pending' | 'paid')}
              className="w-full p-2 border rounded-lg"
              required
              disabled={loading}
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {paymentStatus === 'paid' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full p-2 border rounded-lg"
                required
                disabled={loading}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}

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