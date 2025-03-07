import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload } from 'lucide-react';
import InputField from '../auth/InputField';
import { useAuth } from '../../contexts/AuthContext';
import { useInvitationData } from '../../hooks/useInvitationData';
import { supabase } from '../../lib/supabase';
import { clearInvitationToken } from '../../utils/token';
import toast from 'react-hot-toast';

export default function TenantOnboardingForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { invitationData, loading: invitationLoading } = useInvitationData();
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

  // Pre-fill form with invitation data if available
  useEffect(() => {
    if (invitationData?.tenant) {
      const tenant = invitationData.tenant;
      setFormData(prev => ({
        ...prev,
        firstName: tenant.name.split(' ')[0] || '',
        lastName: tenant.name.split(' ').slice(1).join(' ') || '',
        email: tenant.email || prev.email,
        phone: tenant.phone || '',
      }));
    }
  }, [invitationData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in');
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
        user_type: 'tenant'
      };

      // Create/update profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert(profileData);

      if (profileError) throw profileError;

      // If this was from an invitation, update the invitation status
      if (invitationData) {
        const { error: inviteError } = await supabase
          .from('tenant_invitations')
          .update({ status: 'accepted' })
          .eq('id', invitationData.id);

        if (inviteError) throw inviteError;
      }

      clearInvitationToken();
      toast.success('Profile created successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error creating profile:', error);
      toast.error(error.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  // Rest of the component remains the same as OwnerOnboardingForm
  // but with tenant-specific fields and logic
  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8 my-8">
      <h1 className="text-3xl font-bold mb-8 tracking-wide">Complete Your Profile</h1>
      {/* Form fields similar to OwnerOnboardingForm */}
    </div>
  );
}