-- Create function to safely add user_id column
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

-- Drop existing policies safely
DO $$ 
BEGIN
  -- Drop policies if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tenants' AND policyname = 'Allow tenant viewing'
  ) THEN
    DROP POLICY "Allow tenant viewing" ON tenants;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tenants' AND policyname = 'Allow tenant updates'
  ) THEN
    DROP POLICY "Allow tenant updates" ON tenants;
  END IF;
END $$;

-- Create new policies
CREATE POLICY "Allow tenant management"
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