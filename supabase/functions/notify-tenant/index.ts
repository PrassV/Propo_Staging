import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyParams {
  email: string;
  name: string;
  type: 'bill' | 'vacate';
  propertyName: string;
  ownerEmail: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, name, type, propertyName, ownerEmail } = await req.json() as NotifyParams;

    const subject = type === 'bill' 
      ? `Payment Due for ${propertyName}`
      : `Vacation Notice for ${propertyName}`;

    const html = type === 'bill'
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #000;">Payment Reminder</h1>
          <p>Dear ${name},</p>
          <p>This is a reminder that you have a pending payment for ${propertyName}.</p>
          <p>Please ensure to clear the payment at your earliest convenience.</p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #000;">Vacation Notice</h1>
          <p>Dear ${name},</p>
          <p>This is to notify you that your tenancy at ${propertyName} will be ending.</p>
          <p>Please ensure to complete the vacation process as per the rental agreement.</p>
        </div>
      `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Propify <notifications@resend.dev>',
        to: [ownerEmail], // Send to owner's email during testing
        subject,
        html
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to send email');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending notification:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send notification'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});