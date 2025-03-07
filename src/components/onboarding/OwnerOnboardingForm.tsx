import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload } from 'lucide-react';
import InputField from '../auth/InputField';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export default function OwnerOnboardingForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refetch } = useProfile();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    idType: 'pan_card',
    idImage: null as File | null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.idImage) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setLoading(true);

    try {
      // Upload ID image
      let idImageUrl = '';
      if (formData.idImage) {
        const fileExt = formData.idImage.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('id-documents')
          .upload(filePath, formData.idImage);

        if (uploadError) throw uploadError;
        idImageUrl = filePath;
      }

      const profileData = {
        id: user.id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        address_line1: formData.addressLine1,
        address_line2: formData.addressLine2,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        id_type: formData.idType,
        id_image_url: idImageUrl,
        user_type: 'owner'
      };

      // Use upsert to handle both insert and update cases
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert(profileData, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (profileError) throw profileError;

      await refetch();
      toast.success('Profile created successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error creating profile:', error);
      toast.error(error.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8 my-8">
      <h1 className="text-3xl font-bold mb-8 tracking-wide">Complete Your Profile</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="First Name"
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
            disabled={loading}
          />
          <InputField
            label="Last Name"
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
            disabled={loading}
          />
        </div>

        <InputField
          label="Email"
          type="email"
          value={formData.email}
          disabled
          required
        />

        <InputField
          label="Phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
          disabled={loading}
        />

        <div className="space-y-4">
          <InputField
            label="Address Line 1"
            type="text"
            value={formData.addressLine1}
            onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
            required
            disabled={loading}
          />
          <InputField
            label="Address Line 2"
            type="text"
            value={formData.addressLine2}
            onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
            disabled={loading}
          />
          <div className="grid grid-cols-3 gap-4">
            <InputField
              label="City"
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required
              disabled={loading}
            />
            <InputField
              label="State"
              type="text"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              required
              disabled={loading}
            />
            <InputField
              label="Pincode"
              type="text"
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">ID Type</label>
          <select
            value={formData.idType}
            onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
            className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
            required
            disabled={loading}
          >
            <option value="pan_card">PAN Card</option>
            <option value="aadhaar">Aadhaar</option>
            <option value="passport">Passport</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Upload ID</label>
          <div className="border-2 border-dashed rounded-lg p-4 text-center">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFormData({ ...formData, idImage: e.target.files?.[0] || null })}
              className="hidden"
              id="id-upload"
              required
              disabled={loading}
            />
            <label htmlFor="id-upload" className="cursor-pointer">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <span className="mt-2 block text-sm text-gray-600">
                Click to upload your ID
              </span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-3 rounded-lg font-semibold tracking-wide hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating Profile...' : 'Complete Profile'}
        </button>
      </form>
    </div>
  );
}