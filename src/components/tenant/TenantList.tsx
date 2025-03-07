import { useState } from 'react';
import TenantCard from './TenantCard';
import { Tenant } from '../../types/tenant';
import { Property } from '../../types/property';
import PaymentDetailsTable from '../payment/PaymentDetailsTable';

interface TenantListProps {
  tenants: Tenant[];
  property: Property;
  onUpdate?: () => void;
  showFullDetails?: boolean;
}

export default function TenantList({ tenants, property, onUpdate, showFullDetails = false }: TenantListProps) {
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);

  if (tenants.length === 0) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg text-center">
        <p className="text-gray-600">No tenants found for this property.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {tenants.map(tenant => (
        <div key={tenant.id} className="space-y-4">
          <TenantCard 
            tenant={tenant}
            property={property}
            onUpdate={onUpdate}
            showFullDetails={showFullDetails}
          />
          
          {/* Payment Details Section */}
          <div className="pl-4 border-l-2 border-gray-100">
            <PaymentDetailsTable
              propertyId={property.id}
              tenantId={tenant.id}
              unitNumber={tenant.unit_number}
            />
          </div>
        </div>
      ))}
    </div>
  );
}