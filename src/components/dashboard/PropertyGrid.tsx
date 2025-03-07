import PropertyCard from './PropertyCard';

interface Property {
  id: string;
  property_name: string;
  address_line1: string;
  city: string;
  tenants: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
  }>;
}

interface PropertyGridProps {
  properties: Property[];
  onUpdate: () => void;
}

const PropertyGrid = ({ properties, onUpdate }: PropertyGridProps) => {
  if (properties.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-600">No properties found. Add your first property to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {properties.map(property => (
        <PropertyCard 
          key={property.id} 
          property={property}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
};

export default PropertyGrid;