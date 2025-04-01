import { useState, ChangeEvent } from 'react';
import { Building2, MapPin, Home, IndianRupee } from 'lucide-react';
import InputField from '../components/common/InputField';
import api from '../api'; // Import the api object
import { RentEstimationRequest, RentEstimationResponse } from '../api/types'; // Import types

interface RentEstimationFormData {
  propertyType: string;
  area: string;
  bedrooms: string;
  bathrooms: string;
  location: string;
  amenities: string[];
  furnishingStatus: string;
}

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'Independent House' },
  { value: 'villa', label: 'Villa' },
  { value: 'commercial', label: 'Commercial Space' }
];

const FURNISHING_STATUS = [
  { value: 'unfurnished', label: 'Unfurnished' },
  { value: 'semi_furnished', label: 'Semi-Furnished' },
  { value: 'fully_furnished', label: 'Fully Furnished' }
];

const AMENITIES = [
  'Parking',
  'Security',
  'Gym',
  'Swimming Pool',
  'Power Backup',
  'Club House',
  'Garden',
  'Elevator'
];

export default function RentEstimationPage() {
  const [formData, setFormData] = useState<RentEstimationFormData>({
    propertyType: '',
    area: '',
    bedrooms: '',
    bathrooms: '',
    location: '',
    amenities: [],
    furnishingStatus: ''
  });
  const [estimatedRent, setEstimatedRent] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Add error state

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null); // Reset error
    setEstimatedRent(null); // Reset previous estimate

    // Prepare data for API (ensure types match RentEstimationRequest)
    const requestData: RentEstimationRequest = {
      property_type: formData.propertyType,
      area: parseInt(formData.area, 10),
      bedrooms: parseInt(formData.bedrooms, 10),
      bathrooms: parseInt(formData.bathrooms, 10),
      location: formData.location,
      amenities: formData.amenities,
      furnishing_status: formData.furnishingStatus
    };

    // Validate numeric fields
    if (isNaN(requestData.area) || isNaN(requestData.bedrooms) || isNaN(requestData.bathrooms)) {
      setError("Area, bedrooms, and bathrooms must be valid numbers.");
      setLoading(false);
      return;
    }

    try {
      // Call the API service
      const response: RentEstimationResponse = await api.rentEstimation.estimateRent(requestData);
      setEstimatedRent(response.estimated_rent); // Use the response from API

    } catch (error: unknown) {
      console.error('Error estimating rent:', error);
      let errorMessage = 'Failed to estimate rent. Please try again later.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'formattedMessage' in error) {
        errorMessage = (error as { formattedMessage: string }).formattedMessage;
      }
      setError(errorMessage); // Set error message for display
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-wide mb-2">Rent Estimation</h1>
        <p className="text-gray-600">Get an estimated rental value for your property based on market trends</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Estimation Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
            <select
              value={formData.propertyType}
              onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
              className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
              required
            >
              <option value="">Select Property Type</option>
              {PROPERTY_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Area (sq ft)"
              type="number"
              value={formData.area}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, area: e.target.value })}
              required
              min="0"
            />
            <InputField
              label="Bedrooms"
              type="number"
              value={formData.bedrooms}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, bedrooms: e.target.value })}
              required
              min="0"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Bathrooms"
              type="number"
              value={formData.bathrooms}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, bathrooms: e.target.value })}
              required
              min="0"
            />
            <InputField
              label="Location"
              type="text"
              value={formData.location}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, location: e.target.value })}
              required
              placeholder="Enter area/locality"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Furnishing Status</label>
            <select
              value={formData.furnishingStatus}
              onChange={(e) => setFormData({ ...formData, furnishingStatus: e.target.value })}
              className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
              required
            >
              <option value="">Select Furnishing Status</option>
              {FURNISHING_STATUS.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amenities</label>
            <div className="grid grid-cols-2 gap-3">
              {AMENITIES.map(amenity => (
                <label key={amenity} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.amenities.includes(amenity)}
                    onChange={(e) => {
                      const newAmenities = e.target.checked
                        ? [...formData.amenities, amenity]
                        : formData.amenities.filter(a => a !== amenity);
                      setFormData({ ...formData, amenities: newAmenities });
                    }}
                    className="rounded border-gray-300 text-black focus:ring-black"
                  />
                  <span className="text-sm">{amenity}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Estimating...' : 'Estimate Rent'}
          </button>

          {/* Display API Error Message */}
          {error && (
            <div className="mt-4 text-center text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}
        </form>

        {/* Results Section */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-6">Estimated Rental Value</h2>
          
          {loading && <p className="text-center">Estimating...</p> } 

          {estimatedRent !== null && !loading && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Estimated Monthly Rent</span>
                  <span className="text-2xl font-bold">₹{estimatedRent.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Building2 size={18} />
                  <span>Based on similar {formData.propertyType}s in your area</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin size={18} />
                  <span>Location: {formData.location}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Home size={18} />
                  <span>{formData.bedrooms} BHK, {formData.area} sq ft</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <IndianRupee size={18} />
                  <span>Price per sq ft: ₹{(estimatedRent / parseInt(formData.area)).toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <p className="text-sm text-gray-500">
                  Note: This is an estimated value based on current market trends. Actual rental value may vary based on various factors.
                </p>
              </div>
            </div>
          )}

          {!loading && estimatedRent === null && !error && (
            <div className="text-center text-gray-500">
              <p>Fill in the property details to get an estimated rental value</p>
            </div>
          )}

          {/* Display error in results section as well/instead? */}
          {error && !loading && (
             <div className="text-center text-red-500">
              <p>Could not retrieve estimate: {error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 