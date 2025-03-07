import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Add unit_number to property_tenants if it doesn't exist
    await supabase.rpc('add_column_if_not_exists', {
      table_name: 'property_tenants',
      column_name: 'unit_number',
      column_type: 'TEXT'
    })

    // Add maintenance_fee to tenants if it doesn't exist
    await supabase.rpc('add_column_if_not_exists', {
      table_name: 'tenants',
      column_name: 'maintenance_fee',
      column_type: 'DECIMAL(10,2)'
    })

    // Create indexes
    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'property_tenants',
      column_name: 'unit_number',
      index_name: 'idx_property_tenants_unit'
    })

    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'tenants',
      column_name: 'maintenance_fee',
      index_name: 'idx_tenants_maintenance'
    })

    return new Response(
      JSON.stringify({ success: true }),
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