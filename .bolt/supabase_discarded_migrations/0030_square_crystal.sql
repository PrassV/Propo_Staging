/*
  # Add Tenant Fields and Unit Number

  1. New Fields
    - Add unit_number to property_tenants table
    - Add maintenance_fee to tenants table (if not exists)
  
  2. Changes
    - Make fields optional to support both new and existing tenants
    - Add indexes for better query performance
*/

-- Add unit_number to property_tenants if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'property_tenants' AND column_name = 'unit_number'
  ) THEN
    ALTER TABLE property_tenants
    ADD COLUMN unit_number TEXT;
  END IF;
END $$;

-- Add maintenance_fee to tenants if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'maintenance_fee'
  ) THEN
    ALTER TABLE tenants
    ADD COLUMN maintenance_fee DECIMAL(10,2);
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_property_tenants_unit ON property_tenants(unit_number);
CREATE INDEX IF NOT EXISTS idx_tenants_maintenance ON tenants(maintenance_fee);

-- Update existing rent records to have a default maintenance fee of 0
UPDATE tenants 
SET maintenance_fee = 0 
WHERE rental_type = 'rent' AND maintenance_fee IS NULL;