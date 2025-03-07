import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const CACHE_DURATION = 24 * 60 * 60 // 24 hours in seconds

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const formData = await req.json()

    // Generate cache key based on input parameters
    const cacheKey = JSON.stringify({
      landlordName: formData.landlordName,
      tenantName: formData.tenantName,
      propertyAddress: formData.propertyAddress,
      rentAmount: formData.monthlyRent,
      startDate: formData.startDate,
      duration: formData.leaseDuration
    })

    // Check cache first
    const { data: cachedAgreement } = await supabase
      .from('agreement_cache')
      .select('content')
      .eq('cache_key', cacheKey)
      .single()

    if (cachedAgreement) {
      return new Response(
        JSON.stringify({
          success: true,
          agreement: cachedAgreement.content
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate agreement using Anthropic's API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-2',
        messages: [{
          role: 'user',
          content: `Create a legally valid Indian rental agreement using these details:

Landlord Details:
- Name: ${formData.landlordName}
- Address: ${formData.landlordAddress}
- Phone: ${formData.landlordPhone}

Tenant Details:
- Name: ${formData.tenantName}
- Address: ${formData.tenantAddress}
- Phone: ${formData.tenantPhone}
- Email: ${formData.tenantEmail}
- Aadhaar: ${formData.tenantAadhaar}

Property Details:
- Address: ${formData.propertyAddress}
- Type: ${formData.propertyType}
- Monthly Rent: ₹${formData.monthlyRent}
- Security Deposit: ₹${formData.securityDeposit}
- Lease Duration: ${formData.leaseDuration} months
- Start Date: ${formData.startDate}

Additional Terms:
- Maintenance: ₹${formData.maintenanceCharges}
- Electricity Bills: ${formData.electricityBills === 'tenant' ? 'Paid by Tenant' : 'Paid by Landlord'}
- Water Charges: ${formData.waterCharges === 'tenant' ? 'Paid by Tenant' : 'Paid by Landlord'}
- Notice Period: ${formData.noticePeriod} months

Witness Details:
1. ${formData.witness1Name} - ${formData.witness1Address}
2. ${formData.witness2Name} - ${formData.witness2Address}

Requirements:
1. Use formal legal language
2. Include all standard clauses
3. Comply with Indian Registration Act
4. Format for stamp paper
5. Make court enforceable
6. Use proper structure`
        }],
        max_tokens: 4000,
        temperature: 0.7
      })
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to generate agreement')
    }

    const agreement = result.content[0].text

    // Cache the result
    await supabase
      .from('agreement_cache')
      .insert({
        cache_key: cacheKey,
        content: agreement,
        expires_at: new Date(Date.now() + CACHE_DURATION * 1000).toISOString()
      })

    return new Response(
      JSON.stringify({
        success: true,
        agreement
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error generating agreement:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate agreement'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})