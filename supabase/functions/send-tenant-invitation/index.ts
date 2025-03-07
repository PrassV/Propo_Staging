import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailParams {
  to: string;
  ownerName: string;
  propertyName: string;
  inviteUrl: string;
}

function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function validateParams(params: EmailParams): string | null {
  if (!params.to || !validateEmail(params.to)) {
    return 'Invalid email address';
  }
  if (!params.ownerName?.trim()) {
    return 'Owner name is required';
  }
  if (!params.propertyName?.trim()) {
    return 'Property name is required';
  }
  if (!params.inviteUrl?.trim()) {
    return 'Invite URL is required';
  }
  return null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate API key
    if (!RESEND_API_KEY) {
      throw new Error('Missing RESEND_API_KEY environment variable');
    }

    // Parse and validate request body
    const params: EmailParams = await req.json();
    const validationError = validateParams(params);
    if (validationError) {
      throw new Error(validationError);
    }

    const { to, ownerName, propertyName, inviteUrl } = params;

    // Send email using Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Propify <onboarding@resend.dev>',
        to: [to],
        subject: `${ownerName} invited you to join ${propertyName} on Propify`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #000; margin-bottom: 24px;">Welcome to Propify</h1>
            
            <p style="color: #666; font-size: 16px; line-height: 24px;">
              ${ownerName} has invited you to join ${propertyName} on Propify's property management platform.
            </p>

            <p style="color: #666; font-size: 16px; line-height: 24px;">
              Click the button below to accept the invitation and set up your account:
            </p>

            <a href="${inviteUrl}" 
               style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; margin: 24px 0;">
              Accept Invitation
            </a>

            <p style="color: #666; font-size: 14px; margin-top: 24px;">
              This invitation will expire in 7 days. If you did not expect this invitation, 
              please ignore this email.
            </p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
            
            <p style="color: #999; font-size: 12px;">
              Propify - Professional Property Management Platform
            </p>
          </div>
        `,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to send email');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          id: data.id,
          email: to
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in Edge Function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});