import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useInvitationData } from '../../../hooks/useInvitationData';
import { clearInvitationToken } from '../../../utils/token';
import toast from 'react-hot-toast';
import BasicInfoForm from './BasicInfoForm';
import AddressForm from './AddressForm';
import IdVerificationForm from './IdVerificationForm';
import { TenantFormData } from '../../../types/tenant';

import { uploadFile } from '../../../api/services/uploadService';
import { updateUserProfile, UserProfileUpdateData } from '../../../api/services/userService';

export default function TenantOnboardingForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { invitationData } = useInvitationData();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<TenantFormData>({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    familySize: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    idType: 'aadhaar',
    idNumber: '',
    idProof: null
  });

  // Pre-fill form with invitation data if available
  useEffect(() => {
    if (invitationData?.tenant) {
      const tenant = invitationData.tenant;
      setFormData((prev: TenantFormData) => ({
        ...prev,
        firstName: tenant.name.split(' ')[0] || '',
        lastName: tenant.name.split(' ').slice(1).join(' ') || '',
        email: tenant.email || prev.email,
        phone: tenant.phone || ''
      }));
    }
  }, [invitationData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Upload ID proof using service
      let idProofUrl = '';
      if (formData.idProof) {
        idProofUrl = await uploadFile(formData.idProof, 'tenant_id_document', user.id);
      }

      // Create/update profile using service
      const profileData: UserProfileUpdateData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        address_line1: formData.addressLine1,
        address_line2: formData.addressLine2,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        id_type: formData.idType,
        id_image_url: idProofUrl,
        user_type: 'tenant'
      };
      await updateUserProfile(profileData);

      // Still clear token if it was part of an invitation flow
      if (invitationData) {
        clearInvitationToken();
      }

      toast.success('Profile created successfully!');
      navigate('/dashboard');
    } catch (error: unknown) {
      console.error('Error creating profile:', error);
      let errorMessage = 'Failed to create profile';
      if (error && typeof error === 'object' && 'response' in error && 
          error.response && typeof error.response === 'object' && 'data' in error.response &&
          error.response.data && typeof error.response.data === 'object' && 'detail' in error.response.data) {
           errorMessage = (error.response.data as { detail: string }).detail;
      } else if (error instanceof Error) {
           errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8 my-8">
      <h1 className="text-3xl font-bold mb-8 tracking-wide">Complete Your Profile</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        <BasicInfoForm
          value={formData}
          onChange={setFormData}
          disabled={loading}
        />

        <AddressForm
          value={formData}
          onChange={setFormData}
          disabled={loading}
        />

        <IdVerificationForm
          value={formData}
          onChange={setFormData}
          disabled={loading}
        />

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