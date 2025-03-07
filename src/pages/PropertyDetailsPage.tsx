import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Heart, MapPin, Star, User, Calendar, Wrench, Download } from 'lucide-react';
import { useDataCache } from '../hooks/useDataCache';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/common/LoadingSpinner';
import TenantList from '../components/tenant/TenantList';
import NewRequestModal from '../components/maintenance/NewRequestModal';
import RecordPaymentModal from '../components/payment/RecordPaymentModal';
import PropertyForm from '../components/property/PropertyForm';
import PropertyMap from '../components/property/PropertyMap';
import { getImageUrl } from '../utils/storage';
import { formatCurrency } from '../utils/format';
import toast from 'react-hot-toast';

export default function PropertyDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Use data cache hook for property data
  const { data: property, loading, error, refetch } = useDataCache(`property-${id}`, async () => {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        *,
        tenants:property_tenants(
          tenant:tenants(*),
          unit_number
        ),
        owner:user_profiles(
          first_name,
          last_name,
          email,
          phone
        ),
        maintenance_requests(
          id,
          title,
          status,
          priority,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Property not found');

    return {
      ...data,
      tenants: data.tenants?.map((pt: any) => ({
        ...pt.tenant,
        unit_number: pt.unit_number
      })) || []
    };
  });

  const images = property?.image_urls?.length 
    ? property.image_urls.map(url => getImageUrl(url))
    : ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80"];

  if (loading) return <LoadingSpinner />;
  if (error || !property) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          <p>{error?.message || 'Property not found'}</p>
          <button onClick={() => navigate('/dashboard')} className="mt-2 text-sm underline">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const fullAddress = [
    property.address_line1,
    property.address_line2,
    property.city,
    property.state,
    property.pincode
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
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">What this place offers</h2>
            <div className="grid grid-cols-2 gap-4">
              {property.amenities?.map((amenity) => (
                <div key={amenity} className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-black rounded-full" />
                  <span className="capitalize">{amenity.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Map */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Location</h2>
            <PropertyMap 
              address={fullAddress}
              className="h-[400px] rounded-lg overflow-hidden"
            />
          </div>

          {/* Tenants Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Current Tenants</h2>
            <TenantList 
              tenants={property.tenants} 
              property={property}
              onUpdate={() => refetch()}
              showFullDetails
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
                  <span className="font-medium">{property.number_of_units}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Occupied Units</span>
                  <span className="font-medium">{property.tenants?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vacant Units</span>
                  <span className="font-medium">
                    {property.number_of_units - (property.tenants?.length || 0)}
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
            refetch();
          }}
        />
      )}

      {showPaymentModal && (
        <RecordPaymentModal
          propertyId={id!}
          onClose={() => setShowPaymentModal(false)}
          onSubmit={() => {
            setShowPaymentModal(false);
            refetch();
          }}
        />
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <PropertyForm
              initialData={{
                propertyName: property.property_name,
                propertyType: property.property_type,
                numberOfUnits: property.number_of_units,
                addressLine1: property.address_line1,
                addressLine2: property.address_line2,
                city: property.city,
                state: property.state,
                pincode: property.pincode,
                description: property.description,
                sizeSqft: property.size_sqft,
                bedrooms: property.bedrooms,
                bathrooms: property.bathrooms,
                kitchens: property.kitchens,
                garages: property.garages,
                garageSize: property.garage_size,
                yearBuilt: property.year_built,
                floors: property.floors,
                amenities: property.amenities
              }}
              onSubmit={async (formData) => {
                try {
                  const { error } = await supabase
                    .from('properties')
                    .update(formData)
                    .eq('id', id);

                  if (error) throw error;
                  toast.success('Property updated successfully');
                  setShowEditModal(false);
                  refetch();
                } catch (error: any) {
                  console.error('Error updating property:', error);
                  toast.error(error.message || 'Failed to update property');
                }
              }}
              onCancel={() => setShowEditModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}