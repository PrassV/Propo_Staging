import { useState, useEffect } from 'react';
import { Edit2, Download } from 'lucide-react';
import { Tenant } from '../../types/tenant';
import { formatCurrency } from '../../utils/format';
import { formatDate } from '../../utils/date';
import EditPaymentModal from './EditPaymentModal';
import { generatePaymentPeriods, getPaymentStatus } from '../../utils/payment';

interface RentalPaymentTableProps {
  tenant: Tenant;
}

export default function RentalPaymentTable({ tenant }: RentalPaymentTableProps) {
  const [paymentPeriods, setPaymentPeriods] = useState<any[]>([]);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!tenant.rental_type) return;

      try {
        const startDate = tenant.rental_start_date || tenant.lease_start_date;
        if (!startDate) return;

        // Generate payment periods up to current date
        const periods = generatePaymentPeriods({
          startDate,
          endDate: tenant.rental_end_date || tenant.lease_end_date || '',
          frequency: tenant.rental_frequency || 'one-time',
          rentAmount: tenant.rental_amount || 0,
          maintenanceFee: tenant.maintenance_fee || 0,
          type: tenant.rental_type
        });

        // Get payment status for each period
        const periodsWithStatus = await Promise.all(
          periods.map(async (period) => ({
            ...period,
            status: await getPaymentStatus(tenant.id, period.startDate, period.endDate)
          }))
        );

        setPaymentPeriods(periodsWithStatus);
      } catch (error) {
        console.error('Error fetching payments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [tenant]);

  if (!tenant.rental_type) return null;

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left">Period</th>
              <th className="px-4 py-2 text-left">Due Date</th>
              <th className="px-4 py-2 text-left">Rent</th>
              <th className="px-4 py-2 text-left">Maintenance</th>
              <th className="px-4 py-2 text-left">Total</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-4">Loading payments...</td>
              </tr>
            ) : paymentPeriods.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-4">No payment records found</td>
              </tr>
            ) : (
              paymentPeriods.map((period, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {formatDate(period.startDate)} - {formatDate(period.endDate)}
                  </td>
                  <td className="px-4 py-3">
                    {formatDate(period.dueDate)}
                  </td>
                  <td className="px-4 py-3">
                    {formatCurrency(tenant.rental_amount || 0)}
                  </td>
                  <td className="px-4 py-3">
                    {formatCurrency(tenant.maintenance_fee || 0)}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatCurrency((tenant.rental_amount || 0) + (tenant.maintenance_fee || 0))}
                  </td>
                  <td className="px-4 py-3">
                    <span className={period.status === 'paid' ? 'px-2 py-1 rounded-full text-sm bg-green-100 text-green-800' : 'px-2 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800'}>
                      {period.status === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <button
                        className="text-gray-600 hover:text-black"
                        onClick={() => setEditingPayment(period)}
                        title="Edit Payment"
                      >
                        <Edit2 size={18} />
                      </button>
                      {period.status === 'paid' && (
                        <button 
                          className="text-gray-600 hover:text-black"
                          onClick={() => {
                            // Handle receipt download
                            console.log('Downloading receipt for', period);
                          }}
                          title="Download Receipt"
                        >
                          <Download size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingPayment && (
        <EditPaymentModal
          tenantId={tenant.id}
          periodStart={editingPayment.startDate}
          periodEnd={editingPayment.endDate}
          rentAmount={tenant.rental_amount || 0}
          maintenanceAmount={tenant.maintenance_fee || 0}
          status={editingPayment.status}
          onClose={() => setEditingPayment(null)}
          onSave={() => {
            const fetchPayments = async () => {
              // Re-fetch payment periods
              const periods = generatePaymentPeriods({
                startDate: tenant.rental_start_date || tenant.lease_start_date || '',
                endDate: tenant.rental_end_date || tenant.lease_end_date || '',
                frequency: tenant.rental_frequency || 'one-time',
                rentAmount: tenant.rental_amount || 0,
                maintenanceFee: tenant.maintenance_fee || 0,
                type: tenant.rental_type || 'rent'
              });

              const periodsWithStatus = await Promise.all(
                periods.map(async (period) => ({
                  ...period,
                  status: await getPaymentStatus(tenant.id, period.startDate, period.endDate)
                }))
              );

              setPaymentPeriods(periodsWithStatus);
            };

            fetchPayments();
            setEditingPayment(null);
          }}
        />
      )}
    </div>
  );
}