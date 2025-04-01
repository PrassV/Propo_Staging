import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import TenantForm from '../../components/tenant/TenantForm';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import api from '../../api'; // Import API helper
import { supabase } from '../../lib/supabase'; // Keep for storage uploads
import { useAuth } from '../../contexts/AuthContext'; // Needed for storage path
import { Property, Tenant, TenantCreate, DocumentCreate } from '../../api/types'; // Import necessary types
import { TenantFormData } from '../../types/tenant'; // Local form data type

// Define the structure for uploaded document info (similar to images)
interface UploadedDocumentInfo {
  url: string;
  fileName: string;
  fileType: string;
  size: number;
}

export default function AddTenantPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('property');
  const [property, setProperty] = useState<Property | null>(null);
  const [loadingProperty, setLoadingProperty] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propertyId) {
      fetchPropertyDetails(propertyId);
    } else {
      setLoadingProperty(false);
      setError('No property specified.');
    }
  }, [propertyId]);

  // Fetch property details using the backend API
  const fetchPropertyDetails = async (id: string) => {
    setLoadingProperty(true);
    setError(null);
    try {
      const fetchedProperty = await api.property.getPropertyById(id);
      setProperty(fetchedProperty); 
    } catch (err: unknown) {
      console.error('Error fetching property details:', err);
      let errorMessage = 'Failed to load property details';
       if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null && 'formattedMessage' in err) {
        errorMessage = (err as { formattedMessage: string }).formattedMessage;
      }
      setError(errorMessage);
      toast.error(errorMessage);
      // Optionally navigate back if property load fails critically
      // navigate('/dashboard'); 
    } finally {
      setLoadingProperty(false);
    }
  };

  // Handle Tenant Form Submission (including document uploads)
  const handleAddTenant = async (formData: TenantFormData & { documents?: File[] }) => {
    if (!user || !propertyId || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    
    let createdTenant: Tenant | null = null;
    const uploadedDocUrls: UploadedDocumentInfo[] = [];

    try {
      // 1. Upload Documents to Supabase Storage (if any)
      if (formData.documents && formData.documents.length > 0) {
        toast.loading('Uploading documents...');
        const uploadPromises = formData.documents.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          // Consider a more structured path, e.g., tenant_id if available, or property_id
          const filePath = `tenant-documents/${user.id}/${propertyId}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('tenant-documents') // Use a dedicated bucket
            .upload(filePath, file);

          if (uploadError) {
            throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
          }

          const { data: urlData } = supabase.storage
            .from('tenant-documents')
            .getPublicUrl(filePath);
          
          if (!urlData?.publicUrl) {
            console.warn(`Could not get public URL for ${filePath}`);
            return null;
          }

          return {
            url: urlData.publicUrl,
            fileName: file.name,
            fileType: file.type,
            size: file.size,
          };
        });
        
        const uploadResults = await Promise.all(uploadPromises);
        uploadedDocUrls.push(...uploadResults.filter(result => result !== null) as UploadedDocumentInfo[]);
        toast.dismiss();
        if (uploadedDocUrls.length !== formData.documents.length) {
             toast.error('Some documents failed to upload or retrieve URL.');
        }
      }

      // 2. Prepare Tenant Data for Backend API
      const tenantAPIData: TenantCreate = {
        property_id: propertyId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        tenant_type: formData.tenantType,
        move_in_date: formData.moveInDate,
        lease_end_date: formData.leaseEndDate,
        rent_amount: formData.rentAmount,
        rent_frequency: formData.rentFrequency,
      };

      // 3. Create Tenant Record via Backend API
      toast.loading('Creating tenant record...');
      // Use the response which includes the created tenant object
      const tenantResponse = await api.tenant.createTenant(tenantAPIData);
      createdTenant = tenantResponse.tenant; // Extract tenant from response
      toast.dismiss();

      // 4. Link Uploaded Documents via Backend API
      if (createdTenant && uploadedDocUrls.length > 0) {
        toast.loading('Linking documents...');
        const linkPromises = uploadedDocUrls.map(docInfo => {
          const docData: DocumentCreate = {
            title: docInfo.fileName,
            tenant_id: createdTenant!.id, // Link to the tenant just created
            property_id: propertyId, // Optionally link to property as well
            file_url: docInfo.url,
            file_name: docInfo.fileName,
            file_type: docInfo.fileType,
            file_size: docInfo.size,
            document_type: 'TENANT_DOCUMENT', // Or more specific like ID_PROOF, APPLICATION
            access_level: 'PRIVATE', // Tenant docs likely private
          };
          return api.document.createDocument(docData);
        });
        await Promise.all(linkPromises);
        toast.dismiss();
      }

      toast.success('Tenant added successfully!');
      navigate(`/property/${propertyId}`); // Navigate to property details page

    } catch (err: unknown) {
      toast.dismiss();
      console.error('Error adding tenant:', err);
      let errorMessage = 'Failed to add tenant';
       if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null && 'formattedMessage' in err) {
        errorMessage = (err as { formattedMessage: string }).formattedMessage;
      }
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingProperty) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Handle error state or missing property
  if (error || !property) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/dashboard')} className="flex items-center text-gray-600 hover:text-black mb-6">
            <ArrowLeft size={20} className="mr-2" /> Back to Dashboard
        </button>
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          <p>{error || 'Property not found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(`/property/${propertyId}`)}
        className="flex items-center text-gray-600 hover:text-black mb-6"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Property
      </button>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold mb-6">Add New Tenant</h1>
        <p className="text-gray-600 mb-8">
          Adding tenant to property: {property.property_name}
        </p>

        <TenantForm
          propertyId={propertyId!} // propertyId is checked above
          onSubmit={handleAddTenant} // Pass the new handler
          onCancel={() => navigate(`/property/${propertyId}`)}
        />
      </div>
    </div>
  );
}