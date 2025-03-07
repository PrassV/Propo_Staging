/*
  # Fix tenant RLS policies

  1. Changes
    - Drop existing tenant policies
    - Create separate policies for INSERT and other operations
    - Update property_tenants policies for better access control

  2. Security
    - Allow authenticated users to create tenants
    - Maintain property owner access control for existing tenants
    - Ensure proper linking between properties and tenants
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow tenant creation" ON tenants;
DROP POLICY IF EXISTS "Allow tenant management" ON tenants;
DROP POLICY IF EXISTS "Allow property tenant management" ON property_tenants;

-- Create new policies for tenants table
CREATE POLICY "Anyone can create tenants"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Property owners can read tenants"
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

CREATE POLICY "Property owners can update tenants"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM property_tenants pt
      JOIN properties p ON pt.property_id = p.id
      WHERE pt.tenant_id = tenants.id
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Property owners can delete tenants"
  ON tenants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM property_tenants pt
      JOIN properties p ON pt.property_id = p.id
      WHERE pt.tenant_id = tenants.id
      AND p.owner_id = auth.uid()
    )
  );

-- Create policies for property_tenants table
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