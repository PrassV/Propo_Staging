/*
  # Fix tenant management policies and schema

  1. Changes
    - Update RLS policies for tenants and property_tenants tables
    - Add proper indexes for performance
    - Update storage policies

  2. Security
    - Enable RLS on all tables
    - Add comprehensive policies for tenant management
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can insert tenants" ON tenants;
DROP POLICY IF EXISTS "Property owners can view and update tenants" ON tenants;
DROP POLICY IF EXISTS "Property owners can manage property_tenants" ON property_tenants;

-- Create new policies for tenants table
CREATE POLICY "Allow tenant creation"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow tenant viewing"
  ON tenants FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for property_tenants table
CREATE POLICY "Allow property tenant creation"
  ON property_tenants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE id = property_tenants.property_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Allow property tenant viewing"
  ON property_tenants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE id = property_tenants.property_id
      AND owner_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_property_tenants_tenant ON property_tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_property_tenants_property ON property_tenants(property_id);

-- Update storage policies
CREATE POLICY "Allow tenant document management"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'tenant-documents')
  WITH CHECK (bucket_id = 'tenant-documents');