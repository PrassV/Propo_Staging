import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Heart, MapPin, Star, Calendar, Wrench, Download } from 'lucide-react';
import { usePropertiesApi } from '../hooks/usePropertiesApi';
import { useTenantsApi } from '../hooks/useTenantsApi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import TenantList from '../components/tenant/TenantList';
import NewRequestModal from '../components/maintenance/NewRequestModal';
import RecordPaymentModal from '../components/payment/RecordPaymentModal';
import PropertyForm from '../components/property/PropertyForm';
import PropertyMap from '../components/property/PropertyMap';
import toast from 'react-hot-toast';

// Define extended property type to handle new API properties
interface EnhancedProperty {
  id: string;
  property_name: string;
  property_type: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode?: string;
  zip_code?: string; // Provided by the API
  image_url?: string;
  description?: string;
  bedrooms?: number;
  bathrooms?: number;
  size_sqft?: number;
  year_built?: number;
  tenants?: any[];
  amenities?: string[];
  number_of_units?: number;
}

export default function PropertyDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  // Use the properties API hook
  const { properties, loading: propertiesLoading, error: propertiesError } = usePropertiesApi();
  const property = id ? properties.find(p => p.id === id) as EnhancedProperty | undefined : undefined;

  // If property not found in list, navigate back to dashboard
  useEffect(() => {
    if (!propertiesLoading && !property && id) {
      toast.error('Property not found');
      navigate('/dashboard');
    }
  }, [property, propertiesLoading, id, navigate]);

  if (propertiesLoading) return <LoadingSpinner />;
  if (propertiesError) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          <p>Error loading property details: {propertiesError}</p>
          <button onClick={() => navigate('/dashboard')} className="underline mt-2">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }
  if (!property) return null;

  const images = property?.image_url 
    ? [property.image_url]
    : ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80"];

  const fullAddress = [
    property.address_line1,
    property.address_line2,
    property.city,
    property.state,
    property.pincode || property.zip_code
  ].filter(Boolean).join(', ');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <button onClick={() => navigate('/dashboard')} className="flex items-center text-gray-600 hover:text-black">
          <ArrowLeft size={20} className="mr-2" />
          Back to Dashboard
        </button>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setShowEditModal(true)}
            className="flex items-center space-x-2 text-gray-600 hover:text-black"
          >
            <Star size={20} />
            <span>Edit Property</span>
          </button>
          <button className="flex items-center space-x-2 text-gray-600 hover:text-black">
            <Share2 size={20} />
            <span>Share</span>
          </button>
          <button 
            onClick={() => setIsSaved(!isSaved)}
            className={`flex items-center space-x-2 ${isSaved ? 'text-red-500' : 'text-gray-600 hover:text-black'}`}
          >
            <Heart size={20} fill={isSaved ? 'currentColor' : 'none'} />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="col-span-2 row-span-2 relative">
          <img
            src={images[selectedImage]}
            alt={property.property_name}
            className="w-full h-full object-cover rounded-lg"
          />
          {images.length > 1 && (
            <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
              {selectedImage + 1} / {images.length}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 col-span-2">
          {images.slice(1, 5).map((image, index) => (
            <img
              key={index}
              src={image}
              alt={`${property.property_name} ${index + 2}`}
              className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setSelectedImage(index + 1)}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-12">
        <div className="col-span-2">
          {/* Property Title & Location */}
          <div className="border-b pb-6 mb-6">
            <h1 className="text-3xl font-bold mb-2">{property.property_name}</h1>
            <div className="flex items-center text-gray-600">
              <MapPin size={18} className="mr-2" />
              <span>{fullAddress}</span>
            </div>
          </div>

          {/* Property Details */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {property.bedrooms && (
              <div>
                <h3 className="font-semibold">Bedrooms</h3>
                <p>{property.bedrooms}</p>
              </div>
            )}
            {property.bathrooms && (
              <div>
                <h3 className="font-semibold">Bathrooms</h3>
                <p>{property.bathrooms}</p>
              </div>
            )}
            {property.size_sqft && (
              <div>
                <h3 className="font-semibold">Area</h3>
                <p>{property.size_sqft} sq.ft</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">About this property</h2>
            <p className="text-gray-600 whitespace-pre-line">{property.description}</p>
          </div>

          {/* Amenities */}
          {property.amenities && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">What this place offers</h2>
              <div className="grid grid-cols-2 gap-4">
                {property.amenities.map((amenity) => (
                  <div key={amenity} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-black rounded-full" />
                    <span className="capitalize">{amenity.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Map */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Location</h2>
            {property && fullAddress && (
              <PropertyMap 
                address={fullAddress}
                className="h-[400px] rounded-lg overflow-hidden"
              />
            )}
          </div>

          {/* Tenants Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Current Tenants</h2>
            <TenantList 
              property={property}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 border sticky top-6">
            <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-4">
              <button
                onClick={() => setShowMaintenanceModal(true)}
                className="w-full flex items-center justify-center space-x-2 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Wrench size={18} />
                <span>Create Maintenance Request</span>
              </button>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full flex items-center justify-center space-x-2 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Calendar size={18} />
                <span>Record Payment</span>
              </button>
              <button
                onClick={() => navigate(`/dashboard/documents?property=${id}`)}
                className="w-full flex items-center justify-center space-x-2 border border-black px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download size={18} />
                <span>View Documents</span>
              </button>
            </div>

            {/* Property Stats */}
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-medium mb-4">Property Stats</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Units</span>
                  <span className="font-medium">{property.number_of_units || 1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Occupied Units</span>
                  <span className="font-medium">{property.tenants?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vacancy Rate</span>
                  <span className="font-medium">
                    {property.number_of_units 
                      ? `${Math.round((1 - (property.tenants?.length || 0) / property.number_of_units) * 100)}%`
                      : '0%'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showMaintenanceModal && (
        <NewRequestModal
          onClose={() => setShowMaintenanceModal(false)}
          onSubmit={() => {
            setShowMaintenanceModal(false);
          }}
        />
      )}

      {showPaymentModal && (
        <RecordPaymentModal
          onClose={() => setShowPaymentModal(false)}
          onSubmit={() => {
            setShowPaymentModal(false);
          }}
          propertyId={property.id}
        />
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <PropertyForm
              property={property}
              onClose={() => setShowEditModal(false)}
              onSubmit={async () => {
                setShowEditModal(false);
                return Promise.resolve();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
