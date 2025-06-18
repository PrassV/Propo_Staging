import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PropertyForm from '../../components/property/PropertyForm';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { PropertyFormData, PropertyCreate } from '@/api/types';
import api from '@/api';
import { useState } from 'react';

export default function AddPropertyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddProperty = async (formData: PropertyFormData, images: File[]) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);

    let primaryImageUrl: string | undefined = undefined;

    try {
      // 1. Upload Images via API Service (if any)
      if (images && images.length > 0) {
        toast.loading('Uploading images...');
        try {
          const uploadResponse = await api.property.uploadPropertyImages(images);
          toast.dismiss();
          if (uploadResponse && uploadResponse.imagePaths && uploadResponse.imagePaths.length > 0) {
            primaryImageUrl = uploadResponse.imagePaths[0];
            toast.success('Images uploaded successfully!');
          } else {
            console.warn('Image upload response missing expected imagePaths:', uploadResponse);
            toast.error('Image upload did not return expected URLs.');
          }
        } catch (uploadError) {
          toast.dismiss();
          console.error('Error uploading images:', uploadError);
          toast.error('Image upload failed.');
        }
      }

      // 2. Prepare Property Data for Backend API (matching PropertyCreate)
      const propertyAPIData: PropertyCreate = {
        property_name: formData.propertyName,
        property_type: formData.propertyType,
        address_line1: formData.addressLine1,
        address_line2: formData.addressLine2,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        country: formData.country || 'USA',
        description: formData.description,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        size_sqft: formData.sizeSqft,
        year_built: formData.yearBuilt,
        amenities: formData.amenities,
        image_urls: primaryImageUrl ? [primaryImageUrl] : undefined,
      };

      // 3. Create Property Record via Backend API
      toast.loading('Creating property record...');
      await api.property.createProperty(propertyAPIData);
      toast.dismiss();

      toast.success('Property added successfully!');
      navigate('/dashboard/properties');

    } catch (error: unknown) {
      toast.dismiss();
      console.error('Error adding property:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add property');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/dashboard/properties')}
        className="flex items-center text-gray-600 hover:text-black mb-6"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Properties
      </button>

      <div className="bg-white rounded-lg p-8">
        <h1 className="text-2xl font-bold mb-6">Add New Property</h1>
        <PropertyForm
          onSubmit={handleAddProperty}
          onCancel={() => navigate('/dashboard/properties')}
        />
      </div>
    </div>
  );
} 
