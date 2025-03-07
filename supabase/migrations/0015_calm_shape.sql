/*
  # Add rental details to tenants table

  1. Changes
    - Add rental details columns to tenants table
    - Add constraints to ensure data consistency
    - Update existing policies
*/

-- Add rental details columns if they don't exist
DO $$ 
BEGIN
  -- Add rental type columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'rental_type') THEN
    ALTER TABLE tenants
    ADD COLUMN rental_type TEXT CHECK (rental_type IN ('lease', 'rent')),
    ADD COLUMN rental_frequency TEXT CHECK (rental_frequency IN ('monthly', 'quarterly', 'half-yearly', 'yearly')),
    ADD COLUMN rental_amount DECIMAL(10,2),
    ADD COLUMN advance_amount DECIMAL(10,2),
    ADD COLUMN rental_start_date DATE,
    ADD COLUMN rental_end_date DATE,
    ADD COLUMN lease_amount DECIMAL(10,2),
    ADD COLUMN lease_start_date DATE,
    ADD COLUMN lease_end_date DATE;
  END IF;

  -- Add constraints
  ALTER TABLE tenants
  DROP CONSTRAINT IF EXISTS check_rental_details,
  ADD CONSTRAINT check_rental_details 
  CHECK (
    (rental_type = 'rent' AND rental_frequency IS NOT NULL AND rental_amount IS NOT NULL AND advance_amount IS NOT NULL AND rental_start_date IS NOT NULL AND rental_end_date IS NOT NULL) OR
    (rental_type = 'lease' AND lease_amount IS NOT NULL AND lease_start_date IS NOT NULL AND lease_end_date IS NOT NULL) OR
    (rental_type IS NULL)
  );
END $$;

-- Update policies to allow full tenant management
DROP POLICY IF EXISTS "Allow tenant creation" ON tenants;
DROP POLICY IF EXISTS "Allow tenant viewing" ON tenants;

CREATE POLICY "Property owners can manage tenants"
  ON tenants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM property_tenants pt
      JOIN properties p ON pt.property_id = p.id
      WHERE pt.tenant_id = tenants.id
      AND p.owner_id = auth.uid()
    )
  );