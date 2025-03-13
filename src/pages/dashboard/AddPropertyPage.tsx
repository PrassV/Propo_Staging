import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PropertyForm from '../../components/property/PropertyForm';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { PropertyFormData } from '../../types/property';
import { apiFetch } from '../../utils/api';

export default function AddPropertyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleAddProperty = async (formData: PropertyFormData & { images?: File[] }) => {
    if (!user) return;

    try {
      // Convert images to base64 for the FastAPI endpoint
      const imagePromises = (formData.images || []).map((file) => {
        return new Promise<{ image_name: string; image_data: string }>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              image_name: file.name,
              image_data: reader.result as string
            });
          };
          reader.readAsDataURL(file);
        });
      });

      const images = await Promise.all(imagePromises);
      
      const response = await apiFetch('properties/create-with-images', {
        method: 'POST',
        body: JSON.stringify({
          property_name: formData.propertyName,
          address_line1: formData.addressLine1,
          address_line2: formData.addressLine2 || null,
          city: formData.city,
          state: formData.state,
          zip_code: formData.pincode,
          country: "India",
          property_type: formData.propertyType,
          size_sqft: formData.sizeSqft,
          bedrooms: formData.bedrooms,
          bathrooms: formData.bathrooms,
          amenities: formData.amenities || [],
          description: formData.description || null,
          images: images,
          owner_id: user.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to create property');
      }

      toast.success('Property added successfully!');
      navigate('/dashboard/properties');
    } catch (error: unknown) {
      console.error('Error adding property:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add property');
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
