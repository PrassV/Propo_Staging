import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PropertyForm from '../../components/property/PropertyForm';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// Add this interface if not already defined in your types
interface ExtendedFile extends File {
  uploadedPath?: string;
}

export default function AddPropertyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (formData: any) => {
    if (!user || submitting) return;
    
    setSubmitting(true);
    try {
      // Extract image paths from the File objects
      const imagePaths = formData.images
        ? formData.images
            .map((img: ExtendedFile) => img.uploadedPath)
            .filter(Boolean)
        : [];

      // Create property record
      const { error: propertyError } = await supabase
        .from('properties')
        .insert({
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
          amenities: formData.amenities || [],
          image_urls: imagePaths // Store the image paths here
        });

      if (propertyError) throw propertyError;

      toast.success('Property added successfully!');
      navigate('/dashboard/properties');
    } catch (error: any) {
      console.error('Error adding property:', error);
      toast.error(error.message || 'Failed to add property');
    } finally {
      setSubmitting(false);
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
          onSubmit={handleSubmit}
          onCancel={() => navigate('/dashboard/properties')}
        />
      </div>
    </div>
  );
}