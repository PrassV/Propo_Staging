/*
  # Update tenant invitation policies
  
  1. Changes
    - Drop existing policies
    - Create new policy for public read access
    - Create separate policies for insert, update, and delete operations
  
  2. Security
    - Allow public read access for invitation verification
    - Restrict write operations to authenticated property owners
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can verify invitations" ON tenant_invitations;
DROP POLICY IF EXISTS "Property owners can manage invitations" ON tenant_invitations;

-- Create new policies
CREATE POLICY "Public can verify invitations"
  ON tenant_invitations FOR SELECT
  USING (true);

CREATE POLICY "Property owners can insert invitations"
  ON tenant_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = tenant_invitations.property_id
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Property owners can update invitations"
  ON tenant_invitations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = tenant_invitations.property_id
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Property owners can delete invitations"
  ON tenant_invitations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = tenant_invitations.property_id
      AND p.owner_id = auth.uid()
    )
  );