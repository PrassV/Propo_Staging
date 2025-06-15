import { useState } from 'react';
import { X } from 'lucide-react';
import InputField from '../auth/InputField';
import toast from 'react-hot-toast';
import api from '../../api'; // Import our API object
import { TenantCreate, TenantResponse } from '../../api/types'; // Import necessary types
import { useAuth } from '../../contexts/AuthContext';

interface TenantFormProps {
  propertyId: string;
  onSubmit: () => void;
  onCancel: () => void;
}

const TenantForm = ({ propertyId, onSubmit, onCancel }: TenantFormProps) => {
  const { user, session } = useAuth();
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
    
    // Check authentication first
    if (!user || !session) {
      toast.error('You must be logged in to add a tenant. Please log in and try again.');
      return;
    }

    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Name and Email are required fields.');
      return;
    }

    setLoading(true);

    try {
      // Create Tenant using Tenant Service
      toast.loading('Creating tenant record...');
      
      const tenantData: TenantCreate = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || '',
        tenant_type: 'individual',
        property_id: propertyId,
      };

      console.log('Attempting to create tenant with data:', tenantData);
      console.log('User authenticated:', !!user);
      console.log('Session exists:', !!session);

      const response: TenantResponse = await api.tenant.createTenant(tenantData);
      
      if (!response?.tenant?.id) {
          throw new Error("Tenant creation response did not include a tenant ID.");
      }
      
      toast.dismiss();
      toast.success('Tenant added successfully!');
      onSubmit(); // Call the success callback
    } catch (error) {
      toast.dismiss(); // Dismiss any loading toasts
      console.error('Error adding tenant:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('authentication') || error.message.includes('token')) {
          toast.error('Authentication failed. Please log out and log back in.');
        } else if (error.message.includes('property_id')) {
          toast.error('Invalid property ID. Please try again.');
        } else {
          toast.error(`Failed to add tenant: ${error.message}`);
        }
      } else {
        toast.error('Failed to add tenant. Please check your connection and try again.');
      }
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