-- Drop existing policies
DROP POLICY IF EXISTS "Public can verify invitations" ON tenant_invitations;
DROP POLICY IF EXISTS "Property owners can insert invitations" ON tenant_invitations;
DROP POLICY IF EXISTS "Property owners can update invitations" ON tenant_invitations;
DROP POLICY IF EXISTS "Property owners can delete invitations" ON tenant_invitations;

-- Create new policies
CREATE POLICY "Allow public invitation verification"
  ON tenant_invitations FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow property owners to insert invitations"
  ON tenant_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = tenant_invitations.property_id
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Allow property owners to update invitations"
  ON tenant_invitations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = tenant_invitations.property_id
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Allow property owners to delete invitations"
  ON tenant_invitations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = tenant_invitations.property_id
      AND p.owner_id = auth.uid()
    )
  );