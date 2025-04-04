import TenantCard from './TenantCard';
import { Property, Tenant } from '@/api/types';
import PaymentDetailsTable from '../payment/PaymentDetailsTable';

interface TenantListProps {
  property: Property;
  tenants: Tenant[];
  onUpdate?: () => void;
  showFullDetails?: boolean;
}

function adaptTenantForCard(apiTenant: Tenant): Tenant {
  const adapted = { ...apiTenant };
  
  if (adapted.phone === undefined) {
    adapted.phone = '';
  }
  
  return adapted;
}

export default function TenantList({
  property,
  tenants,
  onUpdate,
  showFullDetails = false,
}: TenantListProps) {
  if (tenants.length === 0) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg text-center">
        <p className="text-gray-600">No tenants found for this property.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {tenants.map((tenant) => (
        <div key={tenant.id} className="space-y-4">
          <TenantCard
            tenant={adaptTenantForCard(tenant)}
            property={property}
            onUpdate={onUpdate}
            showFullDetails={showFullDetails}
          />
          
          {/* Payment Details Section */}
          <div className="pl-4 border-l-2 border-gray-100">
            <PaymentDetailsTable
              propertyId={property.id}
              tenantId={tenant.id}
              unitNumber=""
            />
          </div>
        </div>
      ))}
    </div>
  );
}