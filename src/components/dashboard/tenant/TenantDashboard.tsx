import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import EmptyTenantState from './EmptyTenantState';
import LeaseDetails from './LeaseDetails';
import PaymentPlans from './PaymentPlans';
import PaymentHistory from './PaymentHistory';
import RoommateDetails from './RoommateDetails';
import LoadingSpinner from '../../common/LoadingSpinner';

export default function TenantDashboard() {
  const { user } = useAuth();
  const [tenantData, setTenantData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenantData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Try to get tenant by user_id first
      let { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select(`
          *,
          property_tenants!inner(
            property:properties(*)
          )
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      // If no tenant found by user_id, try by email
      if (!tenantData && !tenantError) {
        const { data: emailTenant, error: emailError } = await supabase
          .from('tenants')
          .select(`
            *,
            property_tenants!inner(
              property:properties(*)
            )
          `)
          .eq('email', user.email)
          .maybeSingle();

        if (emailError) throw emailError;
        
        // If found by email, update the user_id
        if (emailTenant) {
          const { error: updateError } = await supabase
            .from('tenants')
            .update({ user_id: user.id })
            .eq('id', emailTenant.id);

          if (updateError) throw updateError;
          tenantData = emailTenant;
        }
      }

      if (tenantError) throw tenantError;

      setTenantData(tenantData ? {
        ...tenantData,
        property: tenantData.property_tenants[0]?.property
      } : null);
    } catch (error: any) {
      console.error('Error fetching tenant data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTenantData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          <p>{error}</p>
          <button 
            onClick={fetchTenantData}
            className="mt-2 text-sm underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!tenantData?.property) {
    return (
      <EmptyTenantState 
        tenant={tenantData || { name: user?.email?.split('@')[0] || 'User', email: user?.email || '' }}
        onVerificationSuccess={fetchTenantData}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-wide">Welcome, {tenantData.name}!</h1>
          <p className="text-gray-600">{tenantData.property.property_name}</p>
          <p className="text-gray-600">
            {tenantData.property.address_line1}, {tenantData.property.city}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LeaseDetails tenantData={tenantData} />
        <RoommateDetails 
          roommates={tenantData.roommates || []} 
          propertyId={tenantData.property.id}
        />
        <PaymentPlans tenantData={tenantData} />
        <PaymentHistory tenantData={tenantData} />
      </div>
    </div>
  );
}