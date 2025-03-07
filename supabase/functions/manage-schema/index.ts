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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Execute schema updates
    const { error: schemaError } = await supabase.rpc('execute_schema_updates', {
      updates: [
        {
          table: 'maintenance_vendors',
          columns: [
            { name: 'id', type: 'uuid', primary: true, default: 'gen_random_uuid()' },
            { name: 'name', type: 'text', nullable: false },
            { name: 'categories', type: 'text[]', nullable: false },
            { name: 'phone', type: 'text', nullable: false },
            { name: 'email', type: 'text', nullable: false },
            { name: 'address', type: 'text', nullable: false },
            { name: 'rating', type: 'decimal(2,1)', default: '0.0' },
            { name: 'license_number', type: 'text' },
            { name: 'insurance_info', type: 'text' },
            { name: 'documents', type: 'text[]' },
            { name: 'hourly_rate', type: 'decimal(10,2)' },
            { name: 'created_at', type: 'timestamptz', default: 'now()' },
            { name: 'updated_at', type: 'timestamptz', default: 'now()' }
          ],
          policies: [
            {
              name: 'Enable read access for all users',
              operation: 'SELECT',
              expression: 'true'
            },
            {
              name: 'Enable write access for property owners',
              operation: 'ALL',
              expression: "EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND user_type = 'owner')"
            }
          ]
        },
        {
          table: 'maintenance_requests',
          columns: [
            { name: 'id', type: 'uuid', primary: true, default: 'gen_random_uuid()' },
            { name: 'property_id', type: 'uuid', references: 'properties(id)', nullable: false },
            { name: 'created_by', type: 'uuid', references: 'auth.users(id)', nullable: false },
            { name: 'title', type: 'text', nullable: false },
            { name: 'description', type: 'text', nullable: false },
            { name: 'priority', type: 'text', check: "priority IN ('emergency', 'urgent', 'normal', 'low')" },
            { name: 'category', type: 'text', check: "category IN ('plumbing', 'electrical', 'carpentry', 'painting', 'appliance', 'other')" },
            { name: 'location', type: 'text', nullable: false },
            { name: 'estimated_cost', type: 'decimal(10,2)' },
            { name: 'attachments', type: 'text[]' },
            { name: 'status', type: 'text', default: "'new'", check: "status IN ('new', 'in_review', 'approved', 'in_progress', 'completed', 'rejected')" },
            { name: 'workflow_type', type: 'text', default: "'owner_assigned'", check: "workflow_type IN ('owner_assigned', 'tenant_suggested', 'tenant_handled')" },
            { name: 'assigned_vendor_id', type: 'uuid', references: 'maintenance_vendors(id)' },
            { name: 'approved_by', type: 'uuid', references: 'auth.users(id)' },
            { name: 'approved_at', type: 'timestamptz' },
            { name: 'completed_at', type: 'timestamptz' },
            { name: 'created_at', type: 'timestamptz', default: 'now()' },
            { name: 'updated_at', type: 'timestamptz', default: 'now()' }
          ],
          policies: [
            {
              name: 'Users can view their requests',
              operation: 'SELECT',
              expression: "auth.uid() = created_by OR EXISTS (SELECT 1 FROM properties WHERE id = maintenance_requests.property_id AND owner_id = auth.uid())"
            },
            {
              name: 'Users can create requests',
              operation: 'INSERT',
              expression: "auth.uid() = created_by"
            },
            {
              name: 'Property owners can update requests',
              operation: 'UPDATE',
              expression: "EXISTS (SELECT 1 FROM properties WHERE id = maintenance_requests.property_id AND owner_id = auth.uid())"
            }
          ]
        },
        {
          table: 'maintenance_messages',
          columns: [
            { name: 'id', type: 'uuid', primary: true, default: 'gen_random_uuid()' },
            { name: 'request_id', type: 'uuid', references: 'maintenance_requests(id)', nullable: false },
            { name: 'sender_id', type: 'uuid', references: 'auth.users(id)', nullable: false },
            { name: 'sender_type', type: 'text', check: "sender_type IN ('owner', 'tenant', 'vendor')" },
            { name: 'message', type: 'text', nullable: false },
            { name: 'attachments', type: 'text[]' },
            { name: 'created_at', type: 'timestamptz', default: 'now()' }
          ],
          policies: [
            {
              name: 'Users can view messages for their requests',
              operation: 'SELECT',
              expression: "EXISTS (SELECT 1 FROM maintenance_requests WHERE id = maintenance_messages.request_id AND (created_by = auth.uid() OR EXISTS (SELECT 1 FROM properties WHERE id = maintenance_requests.property_id AND owner_id = auth.uid())))"
            },
            {
              name: 'Users can send messages',
              operation: 'INSERT',
              expression: "EXISTS (SELECT 1 FROM maintenance_requests WHERE id = maintenance_messages.request_id AND (created_by = auth.uid() OR EXISTS (SELECT 1 FROM properties WHERE id = maintenance_requests.property_id AND owner_id = auth.uid())))"
            }
          ]
        }
      ]
    });

    if (schemaError) throw schemaError;

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Schema management error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})