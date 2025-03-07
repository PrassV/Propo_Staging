import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useProfile } from '../../../hooks/useProfile';
import InputField from '../../auth/InputField';
import toast from 'react-hot-toast';

interface PropertyVerificationFormProps {
  tenant: {
    name: string;
    email: string;
    phone: string;
  };
  onVerificationSuccess: () => void;
}

export default function PropertyVerificationForm({ tenant, onVerificationSuccess }: PropertyVerificationFormProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [propertyId, setPropertyId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setLoading(true);
    try {
      // First verify the property exists and get tenant details
      const { data: propertyTenant, error: tenantError } = await supabase
        .from('tenants')
        .select(`
          id,
          name,
          email,
          phone,
          property_tenants!inner(
            property_id
          )
        `)
        .eq('property_tenants.property_id', propertyId)
        .single();

      if (tenantError) throw new Error('Property ID not found or no tenant assigned');

      // Verify tenant details match
      const tenantName = `${profile.first_name} ${profile.last_name}`.trim();
      if (
        tenantName.toLowerCase() !== propertyTenant.name.toLowerCase() ||
        user.email?.toLowerCase() !== propertyTenant.email.toLowerCase() ||
        profile.phone !== propertyTenant.phone
      ) {
        throw new Error('Tenant details do not match our records');
      }

      // Update tenant record with user's auth ID
      const { error: updateError } = await supabase
        .from('tenants')
        .update({ user_id: user.id })
        .eq('id', propertyTenant.id);

      if (updateError) throw updateError;

      toast.success('Property verified successfully!');
      onVerificationSuccess();
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error(error.message || 'Failed to verify property');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-2">Enter Property Details</h3>
          <p className="text-sm text-gray-600 mb-4">
            Please enter the Property ID provided by your property owner to verify your tenancy.
          </p>
        </div>

        <InputField
          label="Property ID"
          type="text"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          placeholder="Enter the Property ID"
          required
          disabled={loading}
        />

        <button
          type="submit"
          disabled={loading || !propertyId}
          className="w-full bg-black text-white py-3 rounded-lg font-semibold tracking-wide 
                   hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Verify Property'}
        </button>
      </div>
    </form>
  );
}