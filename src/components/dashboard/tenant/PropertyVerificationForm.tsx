import { useState } from 'react';
// Removed direct Supabase import
// import { supabase } from '../../../lib/supabase'; 
import { useAuth } from '../../../contexts/AuthContext';
// Removed unused import
// import { useProfile } from '../../../hooks/useProfile'; 
import InputField from '../../auth/InputField';
import toast from 'react-hot-toast';
// Import the new service function
import { verifyTenantPropertyLink } from '../../../api/services/tenantService';

interface PropertyVerificationFormProps {
  // Removed tenant prop as it's no longer needed here
  // tenant: {
  //   name: string;
  //   email: string;
  //   phone: string;
  // };
  onVerificationSuccess: () => void;
}

export default function PropertyVerificationForm({ onVerificationSuccess }: PropertyVerificationFormProps) {
  // Removed unused profile state, as verification is now backend-driven
  const { user } = useAuth(); 
  // const { profile } = useProfile(); 
  const [propertyId, setPropertyId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Removed profile check
    if (!user) return; 

    setLoading(true);
    try {
      // Removed direct Supabase calls and client-side verification logic
      /*
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
      */

      // Call the backend service function
      await verifyTenantPropertyLink(propertyId);

      toast.success('Property verified successfully!');
      onVerificationSuccess();
    } catch (error) {
      console.error('Verification error:', error);
      
      // Default error message
      let errorMessage = 'Failed to verify property';
      
      // Check if it looks like an HTTP error response (common pattern)
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