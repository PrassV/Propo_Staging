/*
  # Add tenant_id to tenant_invitations table

  1. Changes
    - Add tenant_id column to tenant_invitations table
    - Add foreign key constraint to tenants table
    - Add index for better performance
*/

-- Add tenant_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_invitations' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE tenant_invitations 
    ADD COLUMN tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for tenant_id
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_tenant ON tenant_invitations(tenant_id);

-- Update policies to include tenant_id in conditions
DROP POLICY IF EXISTS "Property owners can manage invitations" ON tenant_invitations;

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