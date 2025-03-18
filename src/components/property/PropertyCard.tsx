import { useState } from 'react';
import { ChevronRight, UserPlus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '../../utils/storage';
import { Property } from '../../types/property';

interface PropertyCardProps {
  property: Property;
  onDelete?: () => void;
  onAddTenant?: () => void;
  isLoading?: boolean;
}

export default function PropertyCard({ property, onDelete, onAddTenant, isLoading }: PropertyCardProps) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  
  // Get the first image URL from the property
  const imageUrl = property.image_urls?.[0] 
    ? getImageUrl(property.image_urls[0]) 
    : getImageUrl(null);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/property/${property.id}`);
  };

  return (
    <tr className="hover:bg-gray-50 cursor-pointer" onClick={handleClick}>
      <td className="px-4 py-3">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-lg overflow-hidden mr-3">
            <img
              src={imageError ? getImageUrl(null) : imageUrl}
              alt={property.property_name}
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
          </div>
          <div>
            <div className="flex items-center">
              <ChevronRight size={16} className="text-gray-400 mr-2" />
              <span className="font-medium">{property.property_name}</span>
            </div>
          </div>
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
              onAddTenant?.();
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
              onDelete?.();
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
