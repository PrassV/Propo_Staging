import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PropertyForm from '../../components/property/PropertyForm';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { PropertyFormData } from '../../types/property';
import { DocumentCreate, Property, PropertyCreate } from '../../api/types';
import api from '../../api';
import { useState } from 'react';

// Define the structure for uploaded image info
interface UploadedImageInfo {
  url: string;
  fileName: string;
  fileType: string;
  size: number;
}

export default function AddPropertyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use API Property type for the state variable
  let createdProperty: Property | null = null;

  const handleAddProperty = async (formData: PropertyFormData & { images?: File[] }) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);

    const uploadedImageUrls: UploadedImageInfo[] = [];

    try {
      // 1. Upload Images to Supabase Storage (if any)
      if (formData.images && formData.images.length > 0) {
        toast.loading('Uploading images...');
        
        const uploadPromises = formData.images.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const filePath = `${user.id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('property-images')
            .upload(filePath, file);

          if (uploadError) {
            throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('property-images')
            .getPublicUrl(filePath);
          
          if (!urlData?.publicUrl) {
            // Handle case where public URL isn't available (e.g., permissions)
            // Might need cleanup of already uploaded file
            console.warn(`Could not get public URL for ${filePath}`); 
            return null; // Skip this image
          }

          return {
            url: urlData.publicUrl,
            fileName: file.name,
            fileType: file.type,
            size: file.size,
          };
        });

        const uploadResults = await Promise.all(uploadPromises);
        // Filter out any null results from failed URL fetching
        uploadedImageUrls.push(...uploadResults.filter(result => result !== null) as UploadedImageInfo[]);
        toast.dismiss();
        if (uploadedImageUrls.length !== formData.images.length) {
            toast.error('Some images failed to upload or retrieve URL.');
            // Decide if you want to proceed without failed images or stop
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
        zip_code: formData.pincode, // Map form pincode to API zip_code
        country: 'USA', // TODO: Get country from form or config
        description: formData.description,
        bedrooms: formData.bedrooms, // Pass as number | undefined
        bathrooms: formData.bathrooms, // Pass as number | undefined
        area: formData.sizeSqft, // Map form sizeSqft to API area (number | undefined)
        // area_unit: 'sqft', // Add if needed by backend
        year_built: formData.yearBuilt, // Pass as number | undefined
        // image_url: uploadedImageUrls.length > 0 ? uploadedImageUrls[0].url : undefined, // Optional primary image
        // Add other optional fields from PropertyCreate if available in formData
        // number_of_units: formData.numberOfUnits,
      };

      // 3. Create Property Record via Backend API
      toast.loading('Creating property record...');
      // Assign the result directly (type should match now)
      createdProperty = await api.property.createProperty(propertyAPIData);
      toast.dismiss();
      
      // 4. Link Uploaded Images via Backend API (if property created successfully)
      if (createdProperty && uploadedImageUrls.length > 0) {
        toast.loading('Linking images...');
        const linkPromises = uploadedImageUrls.map(imgInfo => {
          const docData: DocumentCreate = {
            title: imgInfo.fileName,
            property_id: createdProperty!.id,
            file_url: imgInfo.url,
            file_name: imgInfo.fileName,
            file_type: imgInfo.fileType,
            file_size: imgInfo.size,
            document_type: 'PROPERTY_IMAGE',
            access_level: 'PUBLIC',
          };
          // Call document service to link the image
          return api.document.createDocument(docData);
        });

        // Wait for all linking calls to complete
        await Promise.all(linkPromises);
        toast.dismiss();
      }

      toast.success('Property added successfully!');
      navigate('/dashboard/properties');

    } catch (error: unknown) {
      toast.dismiss();
      console.error('Error adding property:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add property');
      // Consider cleanup if partial success (e.g., images uploaded but property/linking failed)
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
