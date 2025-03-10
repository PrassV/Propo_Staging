import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PropertyForm from '../../components/property/PropertyForm';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { PropertyFormData } from '../../types/property';

export default function AddPropertyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleAddProperty = async (formData: PropertyFormData & { images?: File[] }) => {
    if (!user) return;

    try {
      // Convert images to base64 for the edge function
      const imagePromises = (formData.images || []).map((file) => {
        return new Promise<{ fileName: string; base64Data: string; fileType: string }>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              fileName: file.name,
              base64Data: reader.result as string,
              fileType: file.type
            });
          };
          reader.readAsDataURL(file);
        });
      });

      const images = await Promise.all(imagePromises);

      // Call the Edge Function
      const response = await fetch('/api/createPropertyWithImages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          propertyData: {
            owner_id: user.id,
            property_name: formData.propertyName,
            property_type: formData.propertyType,
            number_of_units: formData.numberOfUnits,
            address_line1: formData.addressLine1,
            address_line2: formData.addressLine2,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            survey_number: formData.surveyNumber,
            door_number: formData.doorNumber,
            description: formData.description,
            category: formData.category,
            listed_in: formData.listedIn,
            price: formData.price,
            yearly_tax_rate: formData.yearlyTaxRate,
            size_sqft: formData.sizeSqft,
            bedrooms: formData.bedrooms,
            bathrooms: formData.bathrooms,
            kitchens: formData.kitchens,
            garages: formData.garages,
            garage_size: formData.garageSize,
            year_built: formData.yearBuilt,
            floors: formData.floors,
            amenities: formData.amenities || []
          },
          images
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create property');
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
