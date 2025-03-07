/*
  # Update tenant invitations policies
  
  1. Changes
    - Drop existing policies
    - Create new comprehensive policies for public access and owner management
    - Ensure RLS is enabled
    - Grant necessary permissions
*/

-- Drop all existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow public to verify invitations" ON tenant_invitations;
  DROP POLICY IF EXISTS "Allow owners to manage invitations" ON tenant_invitations;
  DROP POLICY IF EXISTS "Allow owners to update invitations" ON tenant_invitations;
  DROP POLICY IF EXISTS "Allow owners to delete invitations" ON tenant_invitations;
  DROP POLICY IF EXISTS "tenant_invitations_public_read" ON tenant_invitations;
  DROP POLICY IF EXISTS "tenant_invitations_owner_insert" ON tenant_invitations;
  DROP POLICY IF EXISTS "tenant_invitations_owner_update" ON tenant_invitations;
  DROP POLICY IF EXISTS "tenant_invitations_owner_delete" ON tenant_invitations;
  DROP POLICY IF EXISTS "Allow public invitation verification" ON tenant_invitations;
  DROP POLICY IF EXISTS "Allow property owners to insert invitations" ON tenant_invitations;
  DROP POLICY IF EXISTS "Allow property owners to update invitations" ON tenant_invitations;
  DROP POLICY IF EXISTS "Allow property owners to delete invitations" ON tenant_invitations;
END $$;

-- Create new comprehensive policies
CREATE POLICY "invitation_public_read_policy_v2"
  ON tenant_invitations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "invitation_owner_insert_policy_v2"
  ON tenant_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = tenant_invitations.property_id
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "invitation_owner_update_policy_v2"
  ON tenant_invitations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = tenant_invitations.property_id
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "invitation_owner_delete_policy_v2"
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