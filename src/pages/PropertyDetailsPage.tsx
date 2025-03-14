import { useState, useCallback, lazy, Suspense, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Heart, MapPin, Star, Calendar, Wrench, Download, Image as ImageIcon } from 'lucide-react';
import { useDataCache } from '../hooks/useDataCache';
import LoadingSpinner from '../components/common/LoadingSpinner';
import TenantList from '../components/tenant/TenantList';
// Lazy load these components to improve initial load time
const NewRequestModal = lazy(() => import('../components/maintenance/NewRequestModal'));
const RecordPaymentModal = lazy(() => import('../components/payment/RecordPaymentModal'));
import PropertyForm from '../components/property/PropertyForm';
import PropertyMap from '../components/property/PropertyMap';
import { getImageUrl, findWorkingBucket } from '../utils/storage';
import toast from 'react-hot-toast';
import { apiFetch, fetchPropertyData } from '../utils/api';
import { PropertyFormData } from '../types/property';

// Default fallback image URL
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80";

export default function PropertyDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);
  const [processedImages, setProcessedImages] = useState<string[]>([DEFAULT_IMAGE]);
  const [loadingImages, setLoadingImages] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    if (!id) throw new Error('Property ID is required');
    
    try {
      // Use the specialized property data fetching function
      return await fetchPropertyData(id);
    } catch (error) {
      console.error('Error fetching property:', error);
      throw error;
    }
  }, [id]);

  const { data: property, loading, error, refetch } = useDataCache(
    `property-${id}`,
    fetchData,
    { ttl: 5 * 60 * 1000, revalidate: false }
  );

  // Process images when property data loads
  useEffect(() => {
    const processImages = async () => {
      if (!property) return;

      try {
        setLoadingImages(true);
        
        // Check if bucket exists
        await findWorkingBucket();
        
        // Safely check for image_urls with more defensive checks
        if (!property.image_urls || !Array.isArray(property.image_urls) || property.image_urls.length === 0) {
          setProcessedImages([DEFAULT_IMAGE]);
          setLoadingImages(false);
          return;
        }

        // Process all image URLs with error handling for each image
        try {
          const imagePromises = property.image_urls.map((url: string) => 
            typeof url === 'string' ? getImageUrl(url) : Promise.resolve(DEFAULT_IMAGE)
          );
          const resolvedImages = await Promise.all(imagePromises);
          
          // Filter out any invalid images
          const validImages = resolvedImages.filter(img => typeof img === 'string' && img.length > 0);
          
          // If we have valid images, use them
          setProcessedImages(validImages.length > 0 ? validImages : [DEFAULT_IMAGE]);
        } catch (imageError) {
          console.error('Error processing image URLs:', imageError);
          setProcessedImages([DEFAULT_IMAGE]);
        }
      } catch (error) {
        console.error('Error processing images:', error);
        setProcessedImages([DEFAULT_IMAGE]);
        setImageLoadError(true);
      } finally {
        setLoadingImages(false);
      }
    };

    processImages();
  }, [property]);

  if (loading) return <LoadingSpinner />;
  if (error) return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">Error loading property details</h2>
        <p className="text-gray-700">{error.message || 'An error occurred while loading the property details'}</p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="mt-4 px-4 py-2 bg-black text-white rounded-lg"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
  if (!property) return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <h2 className="text-xl font-bold text-yellow-600 mb-2">Property Not Found</h2>
        <p className="text-gray-700">The property you are looking for does not exist or has been removed.</p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="mt-4 px-4 py-2 bg-black text-white rounded-lg"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );

  const handleImageError = () => {
    setImageLoadError(true);
    console.warn('Error loading property images');
  };

  // Create safe references to property data with default values
  const safeProperty = {
    property_name: property?.property_name || 'Unnamed Property',
    address_line1: property?.address_line1 || '',
    address_line2: property?.address_line2 || '',
    city: property?.city || '',
    state: property?.state || '',
    pincode: property?.pincode || '',
    bedrooms: property?.bedrooms || 0,
    bathrooms: property?.bathrooms || 0,
    size_sqft: property?.size_sqft || 0,
    description: property?.description || 'No description available',
    amenities: Array.isArray(property?.amenities) ? property.amenities : [],
    tenants: Array.isArray(property?.tenants) ? property.tenants : [],
    number_of_units: property?.number_of_units || 0,
    property_type: property?.property_type || 'residential',
    kitchens: property?.kitchens || 0,
    garages: property?.garages || 0,
    garage_size: property?.garage_size || '',
    year_built: property?.year_built || '',
    floors: property?.floors || 0
  };

  const fullAddress = [
    safeProperty.address_line1,
    safeProperty.address_line2,
    safeProperty.city,
    safeProperty.state,
    safeProperty.pincode
  ].filter(Boolean).join(', ');

  // Safe property stats
  const propertyStats = {
    totalUnits: safeProperty.number_of_units,
    occupiedUnits: safeProperty.tenants.length,
    get vacantUnits() {
      return this.totalUnits - this.occupiedUnits;
    }
  };

  // Update the edit form submission to use FastAPI
  const handlePropertyUpdate = async (formData: PropertyFormData) => {
    try {
      const response = await apiFetch(`properties/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          property_name: formData.propertyName,
          property_type: formData.propertyType,
          address_line1: formData.addressLine1,
          address_line2: formData.addressLine2 || null,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          country: "India",
          size_sqft: formData.sizeSqft,
          bedrooms: formData.bedrooms,
          bathrooms: formData.bathrooms,
          description: formData.description || null,
          amenities: formData.amenities || []
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update property');
      }

      toast.success('Property updated successfully');
      setShowEditModal(false);
      if (refetch) refetch();
    } catch (error) {
      console.error('Error updating property:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update property');
    }
  };

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

      {/* Image Gallery - With Error State Handling */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="col-span-2 row-span-2 relative">
          {loadingImages ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 rounded-lg">
              <LoadingSpinner />
              <p className="text-gray-500 mt-2">Loading property images...</p>
            </div>
          ) : imageLoadError ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 rounded-lg">
              <ImageIcon size={48} className="text-gray-400 mb-2" />
              <p className="text-gray-500">Property image unavailable</p>
            </div>
          ) : (
            <img
              src={processedImages[selectedImage] || DEFAULT_IMAGE}
              alt={safeProperty.property_name}
              className="w-full h-full object-cover rounded-lg"
              onError={handleImageError}
            />
          )}
          {processedImages.length > 1 && !imageLoadError && !loadingImages && (
            <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
              {selectedImage + 1} / {processedImages.length}
            </div>
          )}
        </div>
        
        {/* Thumbnail images */}
        <div className="grid grid-cols-2 gap-4 col-span-2">
          {!loadingImages && !imageLoadError && processedImages.slice(1, 5).map((image: string, index: number) => (
            <img
              key={index}
              src={image}
              alt={`${safeProperty.property_name} ${index + 2}`}
              className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setSelectedImage(index + 1)}
              onError={handleImageError}
            />
          ))}
          
          {/* If loading, show loading placeholders */}
          {loadingImages && 
            Array.from({ length: 4 }).map((_, index) => (
              <div 
                key={index}
                className="w-full h-48 flex items-center justify-center bg-gray-100 rounded-lg"
              >
                <LoadingSpinner />
              </div>
            ))
          }
          
          {/* If no thumbnail images or error, show placeholders */}
          {!loadingImages && (imageLoadError || processedImages.length <= 1) && 
            Array.from({ length: 4 }).map((_, index) => (
              <div 
                key={index}
                className="w-full h-48 flex items-center justify-center bg-gray-100 rounded-lg"
              >
                <ImageIcon size={24} className="text-gray-400" />
              </div>
            ))
          }
        </div>
      </div>

      <div className="grid grid-cols-3 gap-12">
        <div className="col-span-2">
          {/* Property Title & Location */}
          <div className="border-b pb-6 mb-6">
            <h1 className="text-3xl font-bold mb-2">{safeProperty.property_name}</h1>
            <div className="flex items-center text-gray-600">
              <MapPin size={18} className="mr-2" />
              <span>{fullAddress}</span>
            </div>
          </div>

          {/* Property Details */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {safeProperty.bedrooms > 0 && (
              <div>
                <h3 className="font-semibold">Bedrooms</h3>
                <p>{safeProperty.bedrooms}</p>
              </div>
            )}
            {safeProperty.bathrooms > 0 && (
              <div>
                <h3 className="font-semibold">Bathrooms</h3>
                <p>{safeProperty.bathrooms}</p>
              </div>
            )}
            {safeProperty.size_sqft > 0 && (
              <div>
                <h3 className="font-semibold">Area</h3>
                <p>{safeProperty.size_sqft} sq.ft</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">About this property</h2>
            <p className="text-gray-600 whitespace-pre-line">{safeProperty.description}</p>
          </div>

          {/* Amenities */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">What this place offers</h2>
            <div className="grid grid-cols-2 gap-4">
              {safeProperty.amenities.length > 0 ? (
                safeProperty.amenities.map((amenity: string) => (
                  <div key={amenity} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-black rounded-full" />
                    <span className="capitalize">{amenity.replace(/_/g, ' ')}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No amenities listed</p>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Location</h2>
            {fullAddress && (
              <PropertyMap 
                address={fullAddress}
                className="h-[400px] rounded-lg overflow-hidden"
              />
            )}
          </div>

          {/* Tenants Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Current Tenants</h2>
            {safeProperty.tenants.length > 0 ? (
              <TenantList 
                tenants={safeProperty.tenants} 
                property={property}
                onUpdate={() => { if (refetch) refetch(); }}
                showFullDetails
              />
            ) : (
              <p className="text-gray-500">No tenants currently assigned to this property</p>
            )}
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
                  <span className="font-medium">{propertyStats.totalUnits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Occupied Units</span>
                  <span className="font-medium">{propertyStats.occupiedUnits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vacant Units</span>
                  <span className="font-medium">{propertyStats.vacantUnits}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showMaintenanceModal && (
        <Suspense fallback={<LoadingSpinner />}>
          <NewRequestModal
            onClose={() => setShowMaintenanceModal(false)}
            onSubmit={() => {
              setShowMaintenanceModal(false);
              if (refetch) refetch();
            }}
          />
        </Suspense>
      )}

      {showPaymentModal && (
        <Suspense fallback={<LoadingSpinner />}>
          <RecordPaymentModal
            propertyId={id!}
            onClose={() => setShowPaymentModal(false)}
            onSubmit={() => {
              setShowPaymentModal(false);
              if (refetch) refetch();
            }}
          />
        </Suspense>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <PropertyForm
              initialData={{
                propertyName: safeProperty.property_name,
                propertyType: safeProperty.property_type,
                numberOfUnits: safeProperty.number_of_units,
                addressLine1: safeProperty.address_line1,
                addressLine2: safeProperty.address_line2,
                city: safeProperty.city,
                state: safeProperty.state,
                pincode: safeProperty.pincode,
                description: safeProperty.description,
                sizeSqft: safeProperty.size_sqft,
                bedrooms: safeProperty.bedrooms,
                bathrooms: safeProperty.bathrooms,
                kitchens: safeProperty.kitchens,
                garages: safeProperty.garages,
                garageSize: safeProperty.garage_size,
                yearBuilt: safeProperty.year_built,
                floors: safeProperty.floors,
                amenities: safeProperty.amenities
              }}
              onSubmit={handlePropertyUpdate}
              onCancel={() => setShowEditModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}