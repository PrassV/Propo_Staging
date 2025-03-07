import { Trash2 } from 'lucide-react';
import { deleteTenant } from '../../utils/property';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { Property } from '../../types/property';

interface TenantListExpandedProps {
  property: Property;
  onUpdate: () => void;
}

export default function TenantListExpanded({ property, onUpdate }: TenantListExpandedProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleDeleteTenant = async (tenantId: string) => {
    if (!confirm('Are you sure you want to remove this tenant? This action cannot be undone.')) {
      return;
    }

    setLoading(tenantId);
    const result = await deleteTenant(tenantId);
    if (result.success) {
      toast.success('Tenant removed successfully');
      onUpdate();
    }
    setLoading(null);
  };

  return (
    <tr>
      <td colSpan={6} className="px-4 py-3 bg-gray-50">
        {property.tenants?.length > 0 ? (
          <div className="space-y-3">
            {property.tenants.map(tenant => (
              <div key={tenant.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                <div>
                  <p className="font-medium">{tenant.name}</p>
                  <div className="text-sm text-gray-600">
                    <p>{tenant.email}</p>
                    <p>{tenant.phone}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDeleteTenant(tenant.id)}
                    className="text-gray-600 hover:text-red-600"
                    title="Remove Tenant"
                    disabled={loading === tenant.id}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">No tenants found for this property.</p>
        )}
      </td>
    </tr>
  );
}