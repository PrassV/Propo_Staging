import { supabase } from '../lib/supabase';
import { generateToken } from './token';
import config from '../config/urls';

interface SendInvitationParams {
  propertyId: string;
  tenantId: string;
  ownerName: string;
  email: string;
}

export async function sendTenantInvitation({ 
  propertyId, 
  tenantId,
  ownerName, 
  email 
}: SendInvitationParams) {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('Not authenticated');

    // Verify property ownership
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('property_name')
      .eq('id', propertyId)
      .eq('owner_id', user.id)
      .single();

    if (propertyError || !property) {
      throw new Error('Property not found or access denied');
    }

    // Generate token and set expiry
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invitation record
    const { error: inviteError } = await supabase
      .from('tenant_invitations')
      .insert({
        property_id: propertyId,
        tenant_id: tenantId,
        owner_id: user.id,
        email,
        token,
        status: 'pending',
        expires_at: expiresAt.toISOString()
      });

    if (inviteError) throw inviteError;

    // Generate invitation URL
    const inviteUrl = `${config.getBaseUrl()}/#/invite/${token}`;

    // Send email via Edge Function
    const { data, error: functionError } = await supabase.functions.invoke('send-tenant-invitation', {
      body: {
        to: email,
        ownerName,
        propertyName: property.property_name,
        inviteUrl
      }
    });

    if (functionError) throw functionError;
    if (!data?.success) throw new Error(data?.error || 'Failed to send invitation email');

    return { success: true };
  } catch (error) {
    console.error('Error sending invitation:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send invitation'
    };
  }
}

export async function verifyInvitation(token: string) {
  try {
    // Call the Edge Function to verify invitation
    const { data, error } = await supabase.functions.invoke('verify-invitation', {
      body: { token }
    });

    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Invalid invitation');

    return data.data;
  } catch (error: any) {
    console.error('Error verifying invitation:', error);
    throw new Error(error.message || 'Invalid invitation');
  }
}