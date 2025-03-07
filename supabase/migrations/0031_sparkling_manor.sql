-- Drop existing policies\nDROP POLICY IF EXISTS "Allow public to verify invitations" ON tenant_invitations
\nDROP POLICY IF EXISTS "Allow owners to manage invitations" ON tenant_invitations
\nDROP POLICY IF EXISTS "Allow owners to update invitations" ON tenant_invitations
\nDROP POLICY IF EXISTS "Allow owners to delete invitations" ON tenant_invitations
\n\n-- Create new comprehensive policies\nCREATE POLICY "Allow anyone to read invitations"\n  ON tenant_invitations FOR SELECT\n  TO public\n  USING (true)
\n\nCREATE POLICY "Allow owners to insert invitations"\n  ON tenant_invitations FOR INSERT\n  TO authenticated\n  WITH CHECK (\n    EXISTS (\n      SELECT 1 FROM properties p\n      WHERE p.id = tenant_invitations.property_id\n      AND p.owner_id = auth.uid()\n    )\n  )
\n\nCREATE POLICY "Allow owners to update invitations"\n  ON tenant_invitations FOR UPDATE\n  TO authenticated\n  USING (\n    EXISTS (\n      SELECT 1 FROM properties p\n      WHERE p.id = tenant_invitations.property_id\n      AND p.owner_id = auth.uid()\n    )\n  )
\n\nCREATE POLICY "Allow owners to delete invitations"\n  ON tenant_invitations FOR DELETE\n  TO authenticated\n  USING (\n    EXISTS (\n      SELECT 1 FROM properties p\n      WHERE p.id = tenant_invitations.property_id\n      AND p.owner_id = auth.uid()\n    )\n  )
\n\n-- Ensure RLS is enabled\nALTER TABLE tenant_invitations FORCE ROW LEVEL SECURITY
\n\n-- Grant necessary permissions\nGRANT SELECT ON tenant_invitations TO anon
\nGRANT SELECT ON tenant_invitations TO authenticated
