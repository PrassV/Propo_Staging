import { useState } from 'react';
import { X } from 'lucide-react';
import InputField from '../auth/InputField';
import toast from 'react-hot-toast';
import api from '../../api'; // Import our API object
import { TenantCreate, DocumentCreate, TenantResponse, DocumentResponse } from '../../api/types'; // Import necessary types

interface TenantFormProps {
  propertyId: string;
  unitId: string;
  onSubmit: () => void;
  onCancel: () => void;
}

const TenantForm = ({ propertyId, unitId, onSubmit, onCancel }: TenantFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    dob: '',
    gender: 'male',
    familySize: '1',
    permanentAddress: '',
    idType: 'pan_card',
    idNumber: '',
    idProof: null as File | null
  });

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let createdTenantId: string | null = null;
    let createdDocumentId: string | undefined = undefined;

    try {
      // 1. Upload ID Proof
      let idProofUrl: string | undefined = undefined;
      if (formData.idProof) {
        toast.loading('Uploading ID proof...');
        try {
          const uploadResponse = await api.property.uploadPropertyImages([formData.idProof]); 
          toast.dismiss();
          if (uploadResponse?.imageUrls?.[0]) {
            idProofUrl = uploadResponse.imageUrls[0];
            toast.success('ID Proof uploaded.');
          } else {
            console.warn("ID Proof upload response missing URL:", uploadResponse);
            toast.error('Failed to get URL after ID proof upload.');
            setLoading(false); 
            return; 
          }
        } catch (uploadError) {
          toast.dismiss();
          console.error("ID Proof Upload Error:", uploadError);
          toast.error('Failed to upload ID proof.');
          setLoading(false); 
          return;
        }
      }
      
      // 2. Create Document Record using the obtained URL
      if (idProofUrl && formData.idProof) {
          toast.loading('Linking ID proof...');
          try {
              const docData: DocumentCreate = {
                  title: `ID Proof - ${formData.name} - ${formData.idProof.name}`,
                  document_name: formData.idProof.name,
                  property_id: propertyId, 
                  tenant_id: undefined,
                  file_url: idProofUrl,
                  file_name: formData.idProof.name,
                  mime_type: formData.idProof.type,
                  file_extension: formData.idProof.name.split('.').pop(),
                  file_size: formData.idProof.size,
                  document_type: 'id_proof',
                  access_level: 'private',
              };
              const docResponse: DocumentResponse = await api.document.createDocument(docData);
              createdDocumentId = docResponse.document?.id;
              toast.dismiss();
              if (!createdDocumentId) {
                  console.warn("Document link response missing ID:", docResponse);
                  toast.error('Failed to confirm ID proof link.');
              } else {
                  toast.success('ID Proof linked.');
              }
          } catch (linkError) {
              toast.dismiss();
              console.error("Error linking ID Proof document:", linkError);
              toast.error('Failed to link uploaded ID proof.');
          }
      }

      // 3. Create Tenant using Tenant Service
      toast.loading('Creating tenant record...');
      const tenantData: TenantCreate = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        tenant_type: 'individual',
        property_id: propertyId,
      };

      const response: TenantResponse = await api.tenant.createTenant(tenantData);
      if (!response?.tenant?.id) {
          throw new Error("Tenant creation response did not include a tenant ID.");
      }
      createdTenantId = response.tenant.id;
      toast.dismiss();
      
      // 4. Optional: Update Document with Tenant ID if needed
      if (createdDocumentId && createdTenantId) {
           try {
               await api.document.updateDocument(createdDocumentId, { tenant_id: createdTenantId });
           } catch (docUpdateError) {
               console.warn("Failed to update document with tenant ID:", docUpdateError);
           }
      }

      // 5. Link Tenant to Unit (if needed)
      if (createdTenantId && unitId) {
         toast.loading('Linking tenant to unit...');
         console.log(`Simulating linking Tenant ${createdTenantId} to Unit ${unitId}`);
         toast.dismiss();
      }

      toast.success('Tenant added successfully!');
      onSubmit(); // Call the success callback
    } catch (error) {
      toast.dismiss(); // Dismiss any loading toasts
      console.error('Error adding tenant:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-wide">Add New Tenant</h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InputField
          label="Tenant Name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <InputField
          label="Phone Number"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
        />
      </div>

      <InputField
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <InputField
            label="Date of Birth"
            type="date"
            value={formData.dob}
            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
            required
          />
          {formData.dob && (
            <p className="mt-1 text-sm text-gray-600">
              Age: {calculateAge(formData.dob)} years
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Gender</label>
          <select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
            required
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InputField
          label="Family Size"
          type="number"
          min="1"
          value={formData.familySize}
          onChange={(e) => setFormData({ ...formData, familySize: e.target.value })}
          required
        />
      </div>

      <InputField
        label="Permanent Address"
        type="text"
        value={formData.permanentAddress}
        onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">ID Type</label>
          <select
            value={formData.idType}
            onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
            className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
            required
          >
            <option value="pan_card">PAN Card</option>
            <option value="aadhaar">Aadhaar</option>
            <option value="passport">Passport</option>
            <option value="ration_card">Ration Card</option>
          </select>
        </div>
        <InputField
          label="ID Number"
          type="text"
          value={formData.idNumber}
          onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Upload ID Proof</label>
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => setFormData({ ...formData, idProof: e.target.files?.[0] || null })}
          className="w-full p-2 border rounded-lg"
        />
      </div>

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
          {loading ? 'Adding Tenant...' : 'Add Tenant'}
        </button>
      </div>
    </form>
  );
};

export default TenantForm;