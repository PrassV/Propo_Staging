/*
  # Add user_id to tenants table

  1. Changes
    - Add user_id column to tenants table
    - Create index for user_id column
    - Update policies to allow tenant self-management

  2. Security
    - Update RLS policies to allow tenants to manage their own data
    - Maintain property owner access to tenant data
*/

-- Add user_id to tenants table
DO $$ 
BEGIN
  -- Add user_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE tenants ADD COLUMN user_id uuid REFERENCES auth.users(id);
    CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id);
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow tenant viewing" ON tenants;
DROP POLICY IF EXISTS "Allow tenant updates" ON tenants;
DROP POLICY IF EXISTS "Allow tenant management" ON tenants;

-- Create new comprehensive policy
CREATE POLICY "Allow tenant self-management"
  ON tenants FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM property_tenants pt
      JOIN properties p ON pt.property_id = p.id
      WHERE pt.tenant_id = tenants.id
      AND p.owner_id = auth.uid()
    )
  );