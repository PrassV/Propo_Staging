import { X } from 'lucide-react';
import { useState } from 'react';
import { Property } from '../../types/property';
import { Tenant } from '../../types/tenant';
import RentAgreementForm from '../rentAgreement/RentAgreementForm';
import { generateAgreement } from '../../utils/agreement';
import { useProfile } from '../../hooks/useProfile';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

interface RentAgreementModalProps {
  property: Property;
  tenant: Tenant;
  onClose: () => void;
}

export default function RentAgreementModal({ property, tenant, onClose }: RentAgreementModalProps) {
  const [loading, setLoading] = useState(false);
  const { profile, loading: profileLoading } = useProfile();

  const handleSubmit = async (formData: any) => {
    setLoading(true);
    try {
      const result = await generateAgreement(formData);
      
      // Create a text file with the agreement
      const blob = new Blob([result.agreement], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `${property.property_name}-rental-agreement.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Rent agreement generated successfully!');
      onClose();
    } catch (error: any) {
      console.error('Error generating agreement:', error);
      toast.error(error.message || 'Failed to generate agreement');
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while profile is loading
  if (profileLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  // Pre-fill form data from property and tenant details
  const initialData = {
    // Landlord details from profile
    landlordName: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '',
    landlordAddress: profile?.address_line1 || '',
    landlordPhone: profile?.phone || '',

    // Property details
    propertyAddress: [
      property?.address_line1,
      property?.address_line2,
      property?.city,
      property?.state,
      property?.pincode
    ].filter(Boolean).join(', '),
    propertyType: property?.property_type || 'residential',

    // Tenant details
    tenantName: tenant?.name || '',
    tenantEmail: tenant?.email || '',
    tenantPhone: tenant?.phone || '',
    tenantAddress: tenant?.permanentAddress || '',

    // Rental details
    monthlyRent: tenant?.rental_amount?.toString() || '',
    maintenanceCharges: tenant?.maintenance_fee?.toString() || '',
    startDate: tenant?.rental_start_date || tenant?.lease_start_date || '',
    leaseDuration: tenant?.rental_type === 'lease' ? '11' : '12'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Generate Rent Agreement</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <RentAgreementForm 
          onSubmit={handleSubmit}
          loading={loading}
          initialData={initialData}
        />
      </div>
    </div>
  );
}