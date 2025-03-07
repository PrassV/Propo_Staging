-- Drop existing policies
DROP POLICY IF EXISTS "Public can verify pending invitations" ON tenant_invitations;
DROP POLICY IF EXISTS "Property owners can manage invitations" ON tenant_invitations;
DROP POLICY IF EXISTS "Allow owners to manage invitations" ON tenant_invitations;
DROP POLICY IF EXISTS "Allow owners to update invitations" ON tenant_invitations;
DROP POLICY IF EXISTS "Allow owners to delete invitations" ON tenant_invitations;

-- Create new policies with unique names
CREATE POLICY "Allow invitation verification for pending invites"
  ON tenant_invitations FOR SELECT
  TO public
  USING (
    status = 'pending' AND 
    expires_at > now()
  );

CREATE POLICY "Allow property owner invitation management"
  ON tenant_invitations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = tenant_invitations.property_id
      AND p.owner_id = auth.uid()
    )
  );