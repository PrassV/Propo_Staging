import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getStoredInvitationToken } from '../utils/token';

export function useInvitationData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<any>(null);

  useEffect(() => {
    const token = getStoredInvitationToken();
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchInvitationData = async () => {
      try {
        const { data, error } = await supabase
          .from('tenant_invitations')
          .select(`
            *,
            property:properties(
              id,
              property_name,
              address_line1,
              city,
              state
            ),
            tenant:tenants(*)
          `)
          .eq('token', token)
          .eq('status', 'pending')
          .single();

        if (error) throw error;
        setInvitationData(data);
      } catch (err: any) {
        console.error('Error fetching invitation data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInvitationData();
  }, []);

  return { loading, error, invitationData };
}