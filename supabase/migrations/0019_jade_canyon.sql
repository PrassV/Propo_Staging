/*
  # Add tenant invitations system

  1. New Tables
    - tenant_invitations: Stores invitation records with tokens
  
  2. Security
    - Enable RLS on tenant_invitations table
    - Add policy for property owners to manage invitations
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Property owners can manage invitations" ON tenant_invitations;

-- Create tenant invitations table if it doesn't exist
CREATE TABLE IF NOT EXISTS tenant_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES user_profiles(id),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'tenant_invitations' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create policy
CREATE POLICY "Property owners can manage invitations"
  ON tenant_invitations FOR ALL
  TO authenticated
  USING (owner_id = auth.uid());

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token ON tenant_invitations(token);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email ON tenant_invitations(email);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_status ON tenant_invitations(status);