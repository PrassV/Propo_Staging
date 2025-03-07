/*
  # Update tenant queries and relationships

  1. Changes
    - Add indexes for better query performance
    - Update tenant views for complete data
*/

-- Create a view for complete tenant information
CREATE OR REPLACE VIEW complete_tenant_info AS
SELECT 
  t.*,
  pt.property_id,
  pt.start_date as tenancy_start_date,
  pt.end_date as tenancy_end_date
FROM tenants t
JOIN property_tenants pt ON t.id = pt.tenant_id;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tenants_rental_type ON tenants(rental_type);
CREATE INDEX IF NOT EXISTS idx_property_tenants_dates ON property_tenants(start_date, end_date);

-- Update property_tenants table to cascade deletes
ALTER TABLE property_tenants
DROP CONSTRAINT IF EXISTS property_tenants_tenant_id_fkey,
ADD CONSTRAINT property_tenants_tenant_id_fkey 
  FOREIGN KEY (tenant_id) 
  REFERENCES tenants(id) 
  ON DELETE CASCADE;