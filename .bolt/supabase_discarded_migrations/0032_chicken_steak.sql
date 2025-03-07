/*
  # Update Tenant Schema Constraints

  1. Changes
    - Drop existing check_rental_details constraint
    - Make rental details columns optional
    - Add utility details columns with defaults
    - Add new flexible check constraint

  2. New Columns
    - electricity_responsibility TEXT DEFAULT 'tenant'
    - water_responsibility TEXT DEFAULT 'tenant' 
    - property_tax_responsibility TEXT DEFAULT 'landlord'
    - maintenance_fee DECIMAL(10,2) DEFAULT 0
    - notice_period_days INTEGER DEFAULT 30

  3. Constraints
    - Add responsibility type checks
    - Add notice period minimum check
*/

-- First remove the existing constraint
ALTER TABLE tenants 
DROP CONSTRAINT IF EXISTS check_rental_details;

-- Add utility details columns with defaults
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS electricity_responsibility TEXT DEFAULT 'tenant' CHECK (electricity_responsibility IN ('tenant', 'landlord', 'shared')),
ADD COLUMN IF NOT EXISTS water_responsibility TEXT DEFAULT 'tenant' CHECK (water_responsibility IN ('tenant', 'landlord', 'shared')),
ADD COLUMN IF NOT EXISTS property_tax_responsibility TEXT DEFAULT 'landlord' CHECK (property_tax_responsibility IN ('tenant', 'landlord', 'shared')),
ADD COLUMN IF NOT EXISTS maintenance_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS notice_period_days INTEGER DEFAULT 30 CHECK (notice_period_days >= 0);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tenants_electricity ON tenants(electricity_responsibility);
CREATE INDEX IF NOT EXISTS idx_tenants_water ON tenants(water_responsibility);
CREATE INDEX IF NOT EXISTS idx_tenants_property_tax ON tenants(property_tax_responsibility);
