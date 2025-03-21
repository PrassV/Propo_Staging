import { useState } from 'react';
import { Edit2, Download } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { formatDate } from '../../utils/date';
import { usePaymentsApi } from '../../hooks/usePaymentsApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

interface PaymentDetailsTableProps {
  propertyId: string;
  tenantId: string;
  unitNumber: string; // Keep for backward compatibility
  type?: 'rent' | 'electricity' | 'tax';
}

export default function PaymentDetailsTable({ 
  propertyId, 
  tenantId, 
  // unitNumber is kept for backward compatibility but not used with the new API
  type = 'rent'
}: PaymentDetailsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  // Calculate date range for filtering (6 months past to 3 months future)
  const pastDate = new Date();
  pastDate.setMonth(pastDate.getMonth() - 6);
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 3);
  
  // Use the new payments API hook with filters
  const { payments, loading, error } = usePaymentsApi({
    property_id: propertyId,
    tenant_id: tenantId,
    payment_type: type === 'rent' ? 'rent' : type === 'electricity' ? 'utility' : 'tax',
    start_date: pastDate.toISOString().split('T')[0],
    end_date: futureDate.toISOString().split('T')[0]
  });
  
  // Apply pagination
  const paginatedPayments = payments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  const totalPages = Math.ceil(payments.length / ITEMS_PER_PAGE);

  if (error) {
    toast.error('Failed to fetch payments');
    return <div className="text-center py-4 text-red-600">Error loading payments: {error}</div>;
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (!payments || payments.length === 0) {
    return <div className="text-center py-4 text-gray-600">No payment records found</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {type === 'rent' ? 'Period' : type === 'electricity' ? 'Bill Period' : 'Due Date'}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Payment Date
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {paginatedPayments.map(payment => (
            <tr key={payment.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 whitespace-nowrap">
                {formatDate(payment.due_date)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap font-medium">
                {formatCurrency(payment.amount)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span 
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    payment.status === 'paid' ? 'bg-green-100 text-green-800' : 
                    payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                    payment.status === 'overdue' ? 'bg-red-100 text-red-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}
                >
                  {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                {payment.status === 'paid' ? formatDate(payment.updated_at) : '-'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                <button 
                  className="text-gray-600 hover:text-black mx-1"
                  title="Edit Payment"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  className="text-gray-600 hover:text-black mx-1"
                  title="Download Receipt"
                >
                  <Download size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center px-4 py-3 border-t">
          <div className="text-sm text-gray-500">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, payments.length)} of {payments.length} payments
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center px-3 py-1 border rounded-md text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center px-3 py-1 border rounded-md text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}