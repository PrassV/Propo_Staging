/*
  # Fix tenant invitation policies
  
  This migration updates the RLS policies for tenant invitations to:
  1. Allow public read access for invitation verification
  2. Maintain proper owner-only access for management operations
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public to verify invitations" ON tenant_invitations;
DROP POLICY IF EXISTS "Allow owners to manage invitations" ON tenant_invitations;
DROP POLICY IF EXISTS "Allow owners to update invitations" ON tenant_invitations;
DROP POLICY IF EXISTS "Allow owners to delete invitations" ON tenant_invitations;

-- Create new comprehensive policies
CREATE POLICY "tenant_invitations_public_read_2024"
  ON tenant_invitations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "tenant_invitations_owner_insert_2024"
  ON tenant_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = tenant_invitations.property_id
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "tenant_invitations_owner_update_2024"
  ON tenant_invitations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = tenant_invitations.property_id
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "tenant_invitations_owner_delete_2024"
  ON tenant_invitations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = tenant_invitations.property_id
      AND p.owner_id = auth.uid()
    )
  );

-- Ensure RLS is enabled
ALTER TABLE tenant_invitations FORCE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT ON tenant_invitations TO anon;
GRANT SELECT ON tenant_invitations TO authenticated;