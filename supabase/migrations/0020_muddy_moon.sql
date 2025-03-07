/*
  # Fix Tenant Invitations

  1. Changes
    - Drop and recreate tenant_invitations table with proper constraints
    - Add better indexes for performance
    - Update RLS policies for proper access control

  2. Security
    - Enable RLS
    - Add policies for property owners
*/

-- Drop existing table and policies
DROP TABLE IF EXISTS tenant_invitations CASCADE;

-- Create tenant invitations table
CREATE TABLE tenant_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Create indexes
CREATE INDEX idx_tenant_invitations_property ON tenant_invitations(property_id);
CREATE INDEX idx_tenant_invitations_owner ON tenant_invitations(owner_id);
CREATE INDEX idx_tenant_invitations_token ON tenant_invitations(token);
CREATE INDEX idx_tenant_invitations_email ON tenant_invitations(email);
CREATE INDEX idx_tenant_invitations_status ON tenant_invitations(status);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_tenant_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenant_invitations_updated_at
  BEFORE UPDATE ON tenant_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_invitations_updated_at();