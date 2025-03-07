/*
  # Add maintenance fee and update rental constraints

  1. Changes
    - Add maintenance_fee column to tenants table
    - Update rental details constraint to handle maintenance fee
    - Add performance indexes

  2. Notes
    - Uses safe column addition with IF NOT EXISTS check
    - Updates constraint without violating existing data
    - Adds indexes for better query performance
*/

-- First remove the existing constraint to avoid violations
ALTER TABLE tenants 
DROP CONSTRAINT IF EXISTS check_rental_details;

-- Add maintenance fee if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'maintenance_fee'
  ) THEN
    ALTER TABLE tenants ADD COLUMN maintenance_fee DECIMAL(10,2);
  END IF;
END $$;

-- Update all existing rent records to have a default maintenance fee of 0
UPDATE tenants 
SET maintenance_fee = 0 
WHERE rental_type = 'rent' AND maintenance_fee IS NULL;

-- Now add back the constraint with maintenance fee included
ALTER TABLE tenants
ADD CONSTRAINT check_rental_details 
CHECK (
  (rental_type = 'rent' AND 
   rental_frequency IS NOT NULL AND 
   rental_amount IS NOT NULL AND 
   maintenance_fee IS NOT NULL AND
   advance_amount IS NOT NULL AND 
   rental_start_date IS NOT NULL AND 
   rental_end_date IS NOT NULL) 
  OR
  (rental_type = 'lease' AND 
   lease_amount IS NOT NULL AND 
   lease_start_date IS NOT NULL AND 
   lease_end_date IS NOT NULL) 
  OR
  (rental_type IS NULL)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tenants_rental_type ON tenants(rental_type);
CREATE INDEX IF NOT EXISTS idx_tenants_rental_dates ON tenants(rental_start_date, rental_end_date);
CREATE INDEX IF NOT EXISTS idx_tenants_lease_dates ON tenants(lease_start_date, lease_end_date);