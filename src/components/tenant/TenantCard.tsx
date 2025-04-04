import { useState } from 'react';
import { User, Mail, Phone, Edit2 } from 'lucide-react';
import { Tenant, Property } from '@/api/types';
import TenantRentalInfo from './TenantRentalInfo';
import TenantUtilityInfo from './TenantUtilityInfo';
import InviteTenantButton from './InviteTenantButton';
import PropertyActions from '../property/PropertyActions';
import PaymentDetailsSection from '../payment/PaymentDetailsSection';
import EditTenantForm from './EditTenantForm';
import { formatDate } from '@/utils/date';

interface TenantCardProps {
  tenant: Tenant;
  property: Property;
  onUpdate?: () => void;
  showFullDetails?: boolean;
}

export default function TenantCard({ tenant, property, onUpdate, showFullDetails = false }: TenantCardProps) {
  const [showEditForm, setShowEditForm] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-start space-x-4">
          <div className="bg-gray-100 p-3 rounded-full">
            <User className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <h4 className="text-xl font-semibold">{tenant.name}</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-center">
                <Mail size={16} className="mr-2" />
                {tenant.email}
              </div>
              {tenant.phone && (
                <div className="flex items-center">
                  <Phone size={16} className="mr-2" />
                  {tenant.phone}
                </div>
              )}
              <p>Added on: {formatDate(tenant.created_at)}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <InviteTenantButton
            tenantId={tenant.id}
            tenantEmail={tenant.email}
          />
          <PropertyActions
            property={property}
            tenant={tenant}
          />
          <button
            onClick={() => setShowEditForm(true)}
            className="text-gray-600 hover:text-black"
            title="Edit Tenant"
          >
            <Edit2 size={18} />
          </button>
        </div>
      </div>

      {tenant.rental_type && (
        <>
          <TenantRentalInfo tenant={tenant} />
          <TenantUtilityInfo tenant={tenant} />
          
          <PaymentDetailsSection
            propertyId={property.id}
            tenantId={tenant.id}
            unitNumber={null}
            tenantName={tenant.name}
            tenantEmail={tenant.email}
          />
        </>
      )}

      {showEditForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <EditTenantForm
              tenant={tenant}
              onSave={() => {
                setShowEditForm(false);
                onUpdate?.();
              }}
              onCancel={() => setShowEditForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}