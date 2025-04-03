import { formatDate } from '../../../utils/date';
import { TenantWithProperty } from '../../../types/tenant';

interface LeaseDetailsProps {
  tenantData: TenantWithProperty;
}

export default function LeaseDetails({ tenantData }: LeaseDetailsProps) {
  const startDate = tenantData.rental_start_date || tenantData.lease_start_date;
  const endDate = tenantData.rental_end_date || tenantData.lease_end_date;
  const duration = tenantData.rental_type === 'rent' ? '24 Months' : 'Lease Period';
  const evictionNotice = '2 Weeks';

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Lease Agreement</h2>
        <button
          onClick={() => {/* TODO: Implement lease renewal */}}
          className="text-sm bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
        >
          Renew Agreement
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Move in date:</span>
          <span className="font-medium">{formatDate(startDate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Duration:</span>
          <span className="font-medium">{duration}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Eviction date:</span>
          <span className="font-medium">{formatDate(endDate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Eviction notice:</span>
          <span className="font-medium">{evictionNotice}</span>
        </div>
      </div>
    </div>
  );
}