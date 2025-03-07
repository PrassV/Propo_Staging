-- Drop existing policies
DROP POLICY IF EXISTS "Allow public to verify invitations" ON tenant_invitations;
DROP POLICY IF EXISTS "Allow owners to manage invitations" ON tenant_invitations;
DROP POLICY IF EXISTS "Allow owners to update invitations" ON tenant_invitations;
DROP POLICY IF EXISTS "Allow owners to delete invitations" ON tenant_invitations;

-- Create new policies
CREATE POLICY "Public can read invitations"
  ON tenant_invitations FOR SELECT
  TO public
  USING (status = 'pending');

CREATE POLICY "Property owners can manage invitations"
  ON tenant_invitations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = tenant_invitations.property_id
      AND p.owner_id = auth.uid()
    )
  );