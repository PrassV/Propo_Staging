import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { InvitationData } from '../types/invitation';

export function useInvitation(token?: string | null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    const fetchInvitation = async () => {
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
              state,
              property_type,
              owner:user_profiles(
                first_name,
                last_name,
                email,
                phone
              )
            ),
            tenant:tenants(
              id,
              name,
              email,
              phone,
              rental_type,
              rental_amount,
              maintenance_fee,
              rental_frequency,
              rental_start_date,
              rental_end_date
            )
          `)
          .eq('token', token)
          .eq('status', 'pending')
          .single();

        if (error) throw error;
        if (!data) throw new Error('Invalid or expired invitation');

        // Check if invitation has expired
        if (new Date(data.expires_at) < new Date()) {
          await supabase
            .from('tenant_invitations')
            .update({ status: 'expired' })
            .eq('token', token);

          throw new Error('This invitation has expired');
        }

        setInvitation(data);
        setError(null);
      } catch (err: any) {
        console.error('Error verifying invitation:', err);
        setError(err.message || 'Invalid invitation');
        setInvitation(null);
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  return { loading, error, invitation };
}