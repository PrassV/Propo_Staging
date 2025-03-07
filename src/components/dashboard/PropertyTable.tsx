import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Trash2 } from 'lucide-react';
import TenantForm from '../tenant/TenantForm';
import { deleteProperty } from '../../utils/property';
import toast from 'react-hot-toast';
import { Property } from '../../types/property';
import PropertyTableHeader from './PropertyTableHeader';
import PropertyTableRow from './PropertyTableRow';

interface PropertyTableProps {
  properties: Property[];
  onUpdate: () => void;
}

export default function PropertyTable({ properties, onUpdate }: PropertyTableProps) {
  const navigate = useNavigate();
  const [showTenantForm, setShowTenantForm] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const handleDeleteProperty = async (propertyId: string) => {
    if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }

    setLoading(propertyId);
    const result = await deleteProperty(propertyId);
    if (result.success) {
      toast.success('Property deleted successfully');
      onUpdate();
    }
    setLoading(null);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <PropertyTableHeader />
        <tbody className="divide-y divide-gray-200">
          {properties.map((property) => (
            <PropertyTableRow
              key={property.id}
              property={property}
              onDelete={() => handleDeleteProperty(property.id)}
              onAddTenant={() => setShowTenantForm(property.id)}
              isLoading={loading === property.id}
            />
          ))}
        </tbody>
      </table>

      {showTenantForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <TenantForm
              propertyId={showTenantForm}
              onSubmit={() => {
                setShowTenantForm(null);
                onUpdate();
              }}
              onCancel={() => setShowTenantForm(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}