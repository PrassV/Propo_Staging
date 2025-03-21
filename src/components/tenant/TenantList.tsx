import TenantCard from './TenantCard';
import { Property } from '../../types/property';
import { Tenant } from '../../types/tenant';
import PaymentDetailsTable from '../payment/PaymentDetailsTable';
import { useTenantsApi, FrontendTenant } from '../../hooks/useTenantsApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';

interface TenantListProps {
  property: Property;
  onUpdate?: () => void;
  showFullDetails?: boolean;
}

// Helper function to adapt API tenant to the format TenantCard expects
function adaptTenant(apiTenant: FrontendTenant): Tenant {
  return {
    id: apiTenant.id,
    name: apiTenant.name,
    email: apiTenant.email,
    phone: apiTenant.phone || '',
    tenant_type: apiTenant.tenant_type || 'individual',
    move_in_date: apiTenant.move_in_date,
    lease_end_date: apiTenant.lease_end_date,
    rent_amount: apiTenant.rent_amount,
    user_id: apiTenant.user_id,
    property_id: apiTenant.property_id,
    // Add default values for required Tenant properties
    dob: '',
    gender: '',
    familySize: 0,
    permanentAddress: '',
    // Add any other fields from your Tenant type with default values
  };
}

export default function TenantList({ property, onUpdate, showFullDetails = false }: TenantListProps) {
  const { tenants, loading, error, refetch } = useTenantsApi(property.id);

  // Call the parent's onUpdate when data is refreshed
  const handleUpdate = () => {
    refetch();
    if (onUpdate) onUpdate();
  };

  if (loading) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg text-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg text-center">
        <p className="text-red-600">{error}</p>
        <button onClick={handleUpdate} className="text-sm underline mt-2">Try again</button>
      </div>
    );
  }

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
            tenant={adaptTenant(tenant)}
            property={property}
            onUpdate={handleUpdate}
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