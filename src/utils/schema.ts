import { supabase } from '../lib/supabase';

export async function updateSchema() {
  try {
    const { data, error } = await supabase.functions.invoke('manage-schema', {
      body: {
        updates: [
          {
            table: 'tenants',
            columns: [
              {
                name: 'user_id',
                type: 'uuid',
                references: 'auth.users(id)',
                index: true
              },
              {
                name: 'maintenance_fee',
                type: 'decimal(10,2)',
                index: true
              },
              {
                name: 'electricity_responsibility',
                type: 'text',
                check: "electricity_responsibility IN ('tenant', 'landlord', 'shared')"
              },
              {
                name: 'water_responsibility',
                type: 'text',
                check: "water_responsibility IN ('tenant', 'landlord', 'shared')"
              },
              {
                name: 'property_tax_responsibility',
                type: 'text',
                check: "property_tax_responsibility IN ('tenant', 'landlord', 'shared')"
              },
              {
                name: 'notice_period_days',
                type: 'integer',
                default: 30
              }
            ]
          }
        ]
      }
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Schema update error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update schema'
    };
  }
}