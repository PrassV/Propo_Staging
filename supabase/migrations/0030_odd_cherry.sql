-- Drop existing policies\nDROP POLICY IF EXISTS "Allow public invitation verification" ON tenant_invitations
\nDROP POLICY IF EXISTS "Allow property owners to insert invitations" ON tenant_invitations
\nDROP POLICY IF EXISTS "Allow property owners to update invitations" ON tenant_invitations
\nDROP POLICY IF EXISTS "Allow property owners to delete invitations" ON tenant_invitations
\n\n-- Create new policies that allow public access for verification\nCREATE POLICY "Allow public to verify invitations"\n  ON tenant_invitations FOR SELECT\n  TO public\n  USING (true)
\n\nCREATE POLICY "Allow owners to manage invitations"\n  ON tenant_invitations FOR INSERT\n  TO authenticated\n  WITH CHECK (\n    EXISTS (\n      SELECT 1 FROM properties p\n      WHERE p.id = tenant_invitations.property_id\n      AND p.owner_id = auth.uid()\n    )\n  )
\n\nCREATE POLICY "Allow owners to update invitations"\n  ON tenant_invitations FOR UPDATE\n  TO authenticated\n  USING (\n    EXISTS (\n      SELECT 1 FROM properties p\n      WHERE p.id = tenant_invitations.property_id\n      AND p.owner_id = auth.uid()\n    )\n  )
\n\nCREATE POLICY "Allow owners to delete invitations"\n  ON tenant_invitations FOR DELETE\n  TO authenticated\n  USING (\n    EXISTS (\n      SELECT 1 FROM properties p\n      WHERE p.id = tenant_invitations.property_id\n      AND p.owner_id = auth.uid()\n    )\n  )
