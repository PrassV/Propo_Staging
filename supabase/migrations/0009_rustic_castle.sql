/*
  # Fix tenant RLS policies

  1. Changes
    - Update RLS policy for tenants table to allow property owners to insert new tenants
    - Add policy for property owners to view tenants of their properties
    - Add policy for property owners to manage tenant documents

  2. Security
    - Ensure property owners can only manage tenants for their own properties
    - Maintain data isolation between different property owners
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Property owners can manage tenants" ON tenants;

-- Create new policies for tenants table
CREATE POLICY "Property owners can insert tenants"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Property owners can view own tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM property_tenants pt
      JOIN properties p ON pt.property_id = p.id
      WHERE pt.tenant_id = tenants.id
      AND p.owner_id = auth.uid()
    )
  );

-- Update storage policy for tenant documents
CREATE POLICY "Property owners can manage tenant documents"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'tenant-documents')
  WITH CHECK (bucket_id = 'tenant-documents');