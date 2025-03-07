-- Add utility details columns
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS electricity_responsibility TEXT CHECK (electricity_responsibility IN ('tenant', 'landlord', 'shared')) DEFAULT 'tenant',
ADD COLUMN IF NOT EXISTS water_responsibility TEXT CHECK (water_responsibility IN ('tenant', 'landlord', 'shared')) DEFAULT 'tenant',
ADD COLUMN IF NOT EXISTS property_tax_responsibility TEXT CHECK (property_tax_responsibility IN ('tenant', 'landlord', 'shared')) DEFAULT 'landlord',
ADD COLUMN IF NOT EXISTS maintenance_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS notice_period_days INTEGER DEFAULT 30;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tenants_electricity ON tenants(electricity_responsibility);
CREATE INDEX IF NOT EXISTS idx_tenants_water ON tenants(water_responsibility);
CREATE INDEX IF NOT EXISTS idx_tenants_property_tax ON tenants(property_tax_responsibility);