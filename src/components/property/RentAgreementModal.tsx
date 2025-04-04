import { X } from 'lucide-react';
import { useState } from 'react';
import { Property, Tenant, RentAgreementFormData, AgreementGenerationResponse } from '@/api/types';
import RentAgreementForm from '../rentAgreement/RentAgreementForm';
import { generateAgreement } from '@/utils/agreement';
import { useProfile } from '@/hooks/useProfile';
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

  const handleSubmit = async (formData: RentAgreementFormData) => { 
    setLoading(true);
    try {
      const result: AgreementGenerationResponse = await generateAgreement(formData);
      
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
    } catch (error: unknown) {
      console.error('Error generating agreement:', error);
      const message = error instanceof Error ? error.message : 'Failed to generate agreement';
      toast.error(message);
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

  // Correct initialData using fields from @/api/types
  const initialData: RentAgreementFormData = {
    landlordName: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '',
    landlordAddress: '',
    landlordPhone: profile?.phone || '',

    propertyAddress: [
      property?.address_line1,
      property?.address_line2,
      property?.city,
      property?.state,
      property?.zip_code
    ].filter(Boolean).join(', '),
    propertyType: property?.property_type || 'residential',

    tenantName: tenant?.name || '',
    tenantEmail: tenant?.email || '',
    tenantPhone: tenant?.phone || '',
    tenantAddress: '',

    monthlyRent: tenant?.rent_amount?.toString() || '',
    maintenanceCharges: '',
    startDate: tenant?.move_in_date || '',
    leaseDuration: '11',
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