import { formatDate } from '../../utils/date';
import { formatCurrency } from '../../utils/format';

interface RequestInfoProps {
  request: any;
}

export default function RequestInfo({ request }: RequestInfoProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h1 className="text-2xl font-bold mb-4">{request.title}</h1>
      
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">Description</h3>
          <p className="mt-1">{request.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Property</h3>
            <p className="mt-1">{request.property.property_name}</p>
            <p className="text-sm text-gray-600">
              {request.property.address_line1}, {request.property.city}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Created</h3>
            <p className="mt-1">{formatDate(request.created_at)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Priority</h3>
            <p className="mt-1 capitalize">{request.priority}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Category</h3>
            <p className="mt-1 capitalize">{request.category}</p>
          </div>
        </div>

        {request.estimated_cost && (
          <div>
            <h3 className="text-sm font-medium text-gray-500">Estimated Cost</h3>
            <p className="mt-1">{formatCurrency(request.estimated_cost)}</p>
          </div>
        )}

        {request.vendor && (
          <div>
            <h3 className="text-sm font-medium text-gray-500">Assigned Vendor</h3>
            <p className="mt-1">{request.vendor.name}</p>
            <p className="text-sm text-gray-600">{request.vendor.phone}</p>
          </div>
        )}
      </div>
    </div>
  );
}