import { useState } from 'react';
import { X } from 'lucide-react';
import InputField from '../auth/InputField';
import BasicDetails from './form-sections/BasicDetails';
import AddressDetails from './form-sections/AddressDetails';
import ListingDetails from './form-sections/ListingDetails';
import OverviewSection from './form-sections/OverviewSection';
import AmenitiesSection from './form-sections/AmenitiesSection';
import ImageUploadSection from './ImageUploadSection';
import { PropertyFormData } from '../../types/property';
import { uploadPropertyImages } from '../../utils/storage';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface PropertyFormProps {
  initialData?: Partial<PropertyFormData>;
  onSubmit: (property: PropertyFormData & { image_urls?: string[] }) => void;
  onCancel: () => void;
}

export default function PropertyForm({ initialData, onSubmit, onCancel }: PropertyFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formState, setFormState] = useState<{
    data: PropertyFormData;
    images: File[];
  }>({
    data: {
      propertyName: initialData?.propertyName || '',
      propertyType: initialData?.propertyType || 'residential',
      numberOfUnits: initialData?.numberOfUnits || 1,
      addressLine1: initialData?.addressLine1 || '',
      addressLine2: initialData?.addressLine2 || '',
      city: initialData?.city || '',
      state: initialData?.state || '',
      pincode: initialData?.pincode || '',
      surveyNumber: initialData?.surveyNumber || '',
      doorNumber: initialData?.doorNumber || '',
      description: initialData?.description || '',
      category: initialData?.category || '',
      listedIn: initialData?.listedIn || '',
      price: initialData?.price || 0,
      yearlyTaxRate: initialData?.yearlyTaxRate || 0,
      sizeSqft: initialData?.sizeSqft || 0,
      bedrooms: initialData?.bedrooms || 0,
      bathrooms: initialData?.bathrooms || 0,
      kitchens: initialData?.kitchens || 0,
      garages: initialData?.garages || 0,
      garageSize: initialData?.garageSize || 0,
      yearBuilt: initialData?.yearBuilt || 0,
      floors: initialData?.floors || 0,
      amenities: initialData?.amenities || []
    },
    images: []
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !user) return;
    
    setLoading(true);
    try {
      // Upload images first if any
      let imageUrls: string[] = [];
      if (formState.images.length > 0) {
        imageUrls = await uploadPropertyImages(formState.images, user.id);
        if (imageUrls.length === 0) {
          throw new Error('Failed to upload images');
        }
      }

      // Submit form data with image URLs
      await onSubmit({
        ...formState.data,
        image_urls: imageUrls
      });
    } catch (error: any) {
      console.error('Error in form submission:', error);
      toast.error(error.message || 'Failed to submit form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          {initialData ? 'Edit Property' : 'Add New Property'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>
      </div>

      <ImageUploadSection
        images={formState.images}
        onChange={(images) => setFormState(prev => ({ ...prev, images }))}
        disabled={loading}
      />

      <BasicDetails
        value={formState.data}
        onChange={(data) => setFormState(prev => ({ ...prev, data: { ...prev.data, ...data } }))}
        disabled={loading}
      />

      <AddressDetails
        value={formState.data}
        onChange={(data) => setFormState(prev => ({ ...prev, data: { ...prev.data, ...data } }))}
        disabled={loading}
      />

      <OverviewSection
        value={formState.data}
        onChange={(data) => setFormState(prev => ({ ...prev, data: { ...prev.data, ...data } }))}
        disabled={loading}
      />

      <ListingDetails
        value={formState.data}
        onChange={(data) => setFormState(prev => ({ ...prev, data: { ...prev.data, ...data } }))}
        disabled={loading}
      />

      <AmenitiesSection
        value={formState.data}
        onChange={(data) => setFormState(prev => ({ ...prev, data: { ...prev.data, ...data } }))}
        disabled={loading}
      />

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? (initialData ? 'Updating...' : 'Adding...') : (initialData ? 'Update Property' : 'Add Property')}
        </button>
      </div>
    </form>
  );
}