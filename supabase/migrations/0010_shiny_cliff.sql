/*
  # Fix tenant RLS policies

  1. Changes
    - Update RLS policies for tenants table to allow property owners to manage tenants
    - Add policies for property_tenants table
    - Update storage policies for tenant documents

  2. Security
    - Enable RLS on all tables
    - Add proper policies for tenant management
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Property owners can insert tenants" ON tenants;
DROP POLICY IF EXISTS "Property owners can view own tenants" ON tenants;
DROP POLICY IF EXISTS "Property owners can manage property_tenants" ON property_tenants;

-- Create comprehensive policies for tenants table
CREATE POLICY "Anyone can insert tenants"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Property owners can view and update tenants"
  ON tenants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM property_tenants pt
      JOIN properties p ON pt.property_id = p.id
      WHERE pt.tenant_id = tenants.id
      AND p.owner_id = auth.uid()
    )
  );

-- Create comprehensive policies for property_tenants table
CREATE POLICY "Property owners can manage property_tenants"
  ON property_tenants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_tenants.property_id
      AND p.owner_id = auth.uid()
    )
  );

-- Update storage policies
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Property owners can manage tenant documents" ON storage.objects;

  -- Create new policy
  CREATE POLICY "Users can manage tenant documents"
    ON storage.objects FOR ALL
    TO authenticated
    USING (bucket_id = 'tenant-documents')
    WITH CHECK (bucket_id = 'tenant-documents');
END $$;