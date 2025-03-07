import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token } = await req.json()
    
    if (!token) {
      throw new Error('Token is required')
    }

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get invitation with related data
    const { data: invitation, error: inviteError } = await supabase
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
      .single()

    if (inviteError) throw inviteError
    if (!invitation) throw new Error('Invalid invitation')

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      // Update status to expired
      await supabase
        .from('tenant_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)

      throw new Error('This invitation has expired')
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: invitation
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})