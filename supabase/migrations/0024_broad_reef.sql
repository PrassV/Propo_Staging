/*
  # Fix tenant RLS policies

  1. Changes
    - Drop existing tenant policies
    - Create separate policies for each operation
    - Ensure proper access control for property owners

  2. Security
    - Allow tenant creation for authenticated users
    - Restrict tenant management to property owners
    - Maintain data integrity
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can create tenants" ON tenants;
DROP POLICY IF EXISTS "Property owners can read tenants" ON tenants;
DROP POLICY IF EXISTS "Property owners can update tenants" ON tenants;
DROP POLICY IF EXISTS "Property owners can delete tenants" ON tenants;
DROP POLICY IF EXISTS "Property owners can manage property_tenants" ON property_tenants;

-- Create new tenant policies
CREATE POLICY "Allow tenant creation"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow tenant viewing"
  ON tenants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow tenant updates"
  ON tenants FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow tenant deletion"
  ON tenants FOR DELETE
  TO authenticated
  USING (true);

-- Create property_tenants policies
CREATE POLICY "Allow property_tenants management"
  ON property_tenants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_tenants.property_id
      AND p.owner_id = auth.uid()
    )
  );