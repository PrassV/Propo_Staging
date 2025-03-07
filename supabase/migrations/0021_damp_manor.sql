/*
  # Tenant Invitations Schema

  1. New Tables
    - tenant_invitations: Stores invitation records for tenants
      - id (uuid, primary key)
      - property_id (uuid, references properties)
      - owner_id (uuid, references auth.users)
      - email (text)
      - token (text, unique)
      - status (text: pending/accepted/expired)
      - expires_at (timestamptz)
      - created_at (timestamptz)
      - updated_at (timestamptz)

  2. Security
    - Enable RLS
    - Add policy for property owners to manage invitations
*/

-- Drop existing table and recreate with better constraints
DROP TABLE IF EXISTS tenant_invitations CASCADE;

CREATE TABLE tenant_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies
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

-- Create function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
  UPDATE tenant_invitations
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX idx_tenant_invitations_property ON tenant_invitations(property_id);
CREATE INDEX idx_tenant_invitations_owner ON tenant_invitations(owner_id);
CREATE INDEX idx_tenant_invitations_token ON tenant_invitations(token);
CREATE INDEX idx_tenant_invitations_email ON tenant_invitations(email);
CREATE INDEX idx_tenant_invitations_status ON tenant_invitations(status);