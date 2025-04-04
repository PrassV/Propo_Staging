import { FileText, Download } from 'lucide-react';
import { useState } from 'react';
import RentAgreementModal from './RentAgreementModal';
import { Property, Tenant } from '@/api/types';

interface PropertyActionsProps {
  property: Property;
  tenant: Tenant;
}

export default function PropertyActions({ property, tenant }: PropertyActionsProps) {
  const [showAgreementModal, setShowAgreementModal] = useState(false);

  return (
    <>
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setShowAgreementModal(true)}
          className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
        >
          <FileText size={18} />
          <span>Generate Agreement</span>
        </button>
      </div>

      {showAgreementModal && (
        <RentAgreementModal
          property={property}
          tenant={tenant}
          onClose={() => setShowAgreementModal(false)}
        />
      )}
    </>
  );
}