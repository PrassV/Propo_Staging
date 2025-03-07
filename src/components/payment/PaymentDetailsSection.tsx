import { useState } from 'react';
import { Bell } from 'lucide-react';
import PaymentDetailsTable from './PaymentDetailsTable';
import { formatCurrency } from '../../utils/format';
import { formatDate } from '../../utils/date';
import { notifyTenant } from '../../services/paymentService';
import toast from 'react-hot-toast';

interface PaymentDetailsSectionProps {
  propertyId: string;
  tenantId: string;
  unitNumber: string;
  tenantName: string;
  tenantEmail: string;
}

export default function PaymentDetailsSection({
  propertyId,
  tenantId,
  unitNumber,
  tenantName,
  tenantEmail
}: PaymentDetailsSectionProps) {
  const [showPayments, setShowPayments] = useState(true);

  const handleNotifyTenant = async (type: 'electricity' | 'tax') => {
    try {
      const result = await notifyTenant({
        email: tenantEmail,
        name: tenantName,
        type,
        propertyId,
        unitNumber
      });

      if (result.success) {
        toast.success('Notification sent to tenant');
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Error notifying tenant:', error);
      toast.error(error.message || 'Failed to notify tenant');
    }
  };

  return (
    <div className="space-y-6">
      {/* Payment Details Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Payment Details</h3>
        <button 
          onClick={() => setShowPayments(!showPayments)}
          className="text-sm text-gray-600 hover:text-black"
        >
          {showPayments ? 'Hide' : 'Show'} Payments
        </button>
      </div>

      {showPayments && (
        <div className="space-y-8">
          {/* Rent History */}
          <div>
            <h4 className="font-medium mb-4">Rent History</h4>
            <PaymentDetailsTable
              propertyId={propertyId}
              tenantId={tenantId}
              unitNumber={unitNumber}
              type="rent"
            />
          </div>

          {/* Electricity Bills */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium">Electricity Bills</h4>
              <button
                onClick={() => handleNotifyTenant('electricity')}
                className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
              >
                <Bell size={16} />
                <span>Notify Tenant</span>
              </button>
            </div>
            <PaymentDetailsTable
              propertyId={propertyId}
              tenantId={tenantId}
              unitNumber={unitNumber}
              type="electricity"
            />
          </div>

          {/* Tax Payments */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium">Tax Payments</h4>
              <button
                onClick={() => handleNotifyTenant('tax')}
                className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
              >
                <Bell size={16} />
                <span>Notify Tenant</span>
              </button>
            </div>
            <PaymentDetailsTable
              propertyId={propertyId}
              tenantId={tenantId}
              unitNumber={unitNumber}
              type="tax"
            />
          </div>
        </div>
      )}
    </div>
  );
}