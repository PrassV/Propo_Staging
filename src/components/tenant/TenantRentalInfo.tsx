import { Calendar, IndianRupee } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { formatDate } from '../../utils/date';
import { Tenant } from '../../types/tenant';

interface TenantRentalInfoProps {
  tenant: Tenant;
}

export default function TenantRentalInfo({ tenant }: TenantRentalInfoProps) {
  if (!tenant.rental_type) return null;

  const isRental = tenant.rental_type === 'rent';
  const amount = isRental ? tenant.rental_amount : tenant.lease_amount;
  const startDate = isRental ? tenant.rental_start_date : tenant.lease_start_date;
  const endDate = isRental ? tenant.rental_end_date : tenant.lease_end_date;

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h5 className="font-medium">{isRental ? 'Rental Details' : 'Lease Details'}</h5>
        {isRental && (
          <span className="text-sm px-2 py-1 bg-gray-200 rounded-full">
            {tenant.rental_frequency}
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-gray-600">
            <IndianRupee size={18} className="mr-2" />
            <span>{isRental ? 'Rent' : 'Lease Amount'}</span>
          </div>
          <span className="font-medium">{formatCurrency(amount || 0)}</span>
        </div>

        {isRental && tenant.advance_amount && (
          <div className="flex items-center justify-between">
            <div className="flex items-center text-gray-600">
              <IndianRupee size={18} className="mr-2" />
              <span>Advance</span>
            </div>
            <span className="font-medium">{formatCurrency(tenant.advance_amount)}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center text-gray-600">
            <Calendar size={18} className="mr-2" />
            <span>Period</span>
          </div>
          <div className="text-right text-sm">
            <div>{formatDate(startDate || '')}</div>
            <div>{formatDate(endDate || '')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}