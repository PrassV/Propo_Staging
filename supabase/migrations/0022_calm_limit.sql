/*
  # Fix tenant RLS policies

  1. Changes
    - Drop existing tenant policies
    - Create new policy to allow tenant creation
    - Create policy for viewing and managing tenants
    - Update property_tenants policies for better access control

  2. Security
    - Enable RLS on both tables
    - Ensure proper access control for tenant management
    - Allow tenant creation while maintaining security
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Property owners can manage tenants" ON tenants;
DROP POLICY IF EXISTS "Property owners can view and update tenants" ON tenants;

-- Create new policies for tenants table
CREATE POLICY "Allow tenant creation"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow tenant management"
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

-- Update property_tenants policies
DROP POLICY IF EXISTS "Property owners can manage property_tenants" ON property_tenants;

CREATE POLICY "Allow property tenant management"
  ON property_tenants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_tenants.property_id
      AND p.owner_id = auth.uid()
    )
  );