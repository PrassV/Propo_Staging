-- Safely drop existing policies
DO $$ 
BEGIN
  -- Drop policies if they exist
  DROP POLICY IF EXISTS "Allow public invitation verification" ON tenant_invitations;
  DROP POLICY IF EXISTS "Allow property owners to insert invitations" ON tenant_invitations;
  DROP POLICY IF EXISTS "Allow property owners to update invitations" ON tenant_invitations;
  DROP POLICY IF EXISTS "Allow property owners to delete invitations" ON tenant_invitations;
END $$;

-- Create single policy for public verification
CREATE POLICY "tenant_invitations_public_read"
  ON tenant_invitations FOR SELECT
  TO public
  USING (true);

-- Create single policy for authenticated users to manage invitations
CREATE POLICY "tenant_invitations_owner_management"
  ON tenant_invitations 
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = tenant_invitations.property_id
      AND p.owner_id = auth.uid()
    )
  );