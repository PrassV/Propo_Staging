import { ChevronRight, UserPlus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Property } from '../../types/property';

interface PropertyTableRowProps {
  property: Property;
  onDelete: () => void;
  onAddTenant: () => void;
  isLoading: boolean;
}

export default function PropertyTableRow({
  property,
  onDelete,
  onAddTenant,
  isLoading
}: PropertyTableRowProps) {
  const navigate = useNavigate();

  return (
    <tr 
      className="hover:bg-gray-50 cursor-pointer"
      onClick={() => navigate(`/property/${property.id}`)}
    >
      <td className="px-4 py-3">
        <div className="flex items-center">
          <ChevronRight size={16} className="mr-2 text-gray-400" />
          <span className="font-medium">{property.property_name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-gray-600">
        {property.address_line1}, {property.city}
      </td>
      <td className="px-4 py-3 text-gray-600 capitalize">
        {property.property_type}
      </td>
      <td className="px-4 py-3 text-gray-600">
        {property.number_of_units}
      </td>
      <td className="px-4 py-3 text-gray-600">
        {property.tenants?.length || 0}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddTenant();
            }}
            className="text-gray-600 hover:text-gray-900"
            title="Add Tenant"
            disabled={isLoading}
          >
            <UserPlus size={18} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-gray-600 hover:text-red-600"
            title="Delete Property"
            disabled={isLoading}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </td>
    </tr>
  );
}