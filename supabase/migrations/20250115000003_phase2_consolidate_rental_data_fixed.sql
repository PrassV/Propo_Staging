-- Phase 2: Database Schema Updates and Data Consolidation (Fixed)
-- Migration: 20250115000003_phase2_consolidate_rental_data_fixed.sql
-- Purpose: Add new fields to leases table and prepare for rental data consolidation

-- ============================================================================
-- STEP 1: ADD NEW FIELDS TO LEASES TABLE
-- ============================================================================

-- Add rental_type field to leases table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leases' AND column_name = 'rental_type') THEN
        ALTER TABLE leases ADD COLUMN rental_type VARCHAR(20) DEFAULT 'lease';
    END IF;
END $$;

-- Add rental_frequency field to leases table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leases' AND column_name = 'rental_frequency') THEN
        ALTER TABLE leases ADD COLUMN rental_frequency VARCHAR(20) DEFAULT 'monthly';
    END IF;
END $$;

-- Add maintenance_fee field to leases table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leases' AND column_name = 'maintenance_fee') THEN
        ALTER TABLE leases ADD COLUMN maintenance_fee DECIMAL(10,2) DEFAULT 0.00;
    END IF;
END $$;

-- Add advance_amount field to leases table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leases' AND column_name = 'advance_amount') THEN
        ALTER TABLE leases ADD COLUMN advance_amount DECIMAL(10,2) DEFAULT 0.00;
    END IF;
END $$;

-- ============================================================================
-- STEP 2: CREATE BACKUP TABLES
-- ============================================================================

-- Create backup table for tenants rental data
CREATE TABLE IF NOT EXISTS backup_tenants_rental_data AS
SELECT 
    id,
    rent,
    rental_start_date,
    rental_end_date,
    rental_type,
    rental_frequency,
    maintenance_fee,
    created_at,
    NOW() as backup_created_at
FROM tenants 
WHERE rent IS NOT NULL 
   OR rental_start_date IS NOT NULL 
   OR rental_end_date IS NOT NULL 
   OR rental_type IS NOT NULL 
   OR rental_frequency IS NOT NULL 
   OR maintenance_fee IS NOT NULL;

-- Create backup table for units rental data
CREATE TABLE IF NOT EXISTS backup_units_rental_data AS
SELECT 
    id,
    unit_number,
    property_id,
    rent,
    deposit,
    start_date,
    end_date,
    rent_frequency,
    created_at,
    NOW() as backup_created_at
FROM units 
WHERE rent IS NOT NULL 
   OR deposit IS NOT NULL 
   OR start_date IS NOT NULL 
   OR end_date IS NOT NULL 
   OR rent_frequency IS NOT NULL;

-- Create backup table for property_tenants rental data
CREATE TABLE IF NOT EXISTS backup_property_tenants_rental_data AS
SELECT 
    id,
    property_id,
    tenant_id,
    rent_amount,
    deposit_amount,
    start_date,
    end_date,
    created_at,
    NOW() as backup_created_at
FROM property_tenants 
WHERE rent_amount IS NOT NULL 
   OR deposit_amount IS NOT NULL 
   OR start_date IS NOT NULL 
   OR end_date IS NOT NULL;

-- ============================================================================
-- STEP 3: MIGRATE ORPHANED RENTAL DATA TO LEASES TABLE
-- ============================================================================

-- Migrate units with rental data but no corresponding lease (this is the safest approach)
INSERT INTO leases (
    property_id,
    tenant_id,
    unit_id,
    rent_amount,
    deposit_amount,
    start_date,
    end_date,
    rental_type,
    rental_frequency,
    status,
    created_at,
    updated_at
)
SELECT 
    u.property_id,
    u.tenant_id, -- Units table has tenant_id
    u.id as unit_id,
    u.rent as rent_amount,
    u.deposit as deposit_amount,
    u.start_date,
    u.end_date,
    'lease' as rental_type, -- Default to lease for units
    COALESCE(u.rent_frequency::text, 'monthly') as rental_frequency,
    'active' as status,
    NOW() as created_at,
    NOW() as updated_at
FROM units u
LEFT JOIN leases l ON u.id = l.unit_id
WHERE (u.rent IS NOT NULL OR u.deposit IS NOT NULL OR u.start_date IS NOT NULL OR u.end_date IS NOT NULL)
  AND l.id IS NULL
  AND u.tenant_id IS NOT NULL; -- Only migrate if tenant_id exists

-- Migrate tenants with rental data but no corresponding lease (only if we can find a property)
INSERT INTO leases (
    property_id,
    tenant_id,
    unit_id,
    rent_amount,
    deposit_amount,
    start_date,
    end_date,
    rental_type,
    rental_frequency,
    maintenance_fee,
    status,
    created_at,
    updated_at
)
SELECT 
    u.property_id, -- Get property_id from units table
    t.id as tenant_id,
    u.id as unit_id,
    t.rent as rent_amount,
    NULL as deposit_amount, -- Tenants table doesn't have deposit
    t.rental_start_date as start_date,
    t.rental_end_date as end_date,
    COALESCE(t.rental_type, 'lease') as rental_type,
    COALESCE(t.rental_frequency, 'monthly') as rental_frequency,
    COALESCE(t.maintenance_fee, 0.00) as maintenance_fee,
    'active' as status,
    NOW() as created_at,
    NOW() as updated_at
FROM tenants t
JOIN units u ON t.id = u.tenant_id -- Join with units to get property_id
LEFT JOIN leases l ON t.id = l.tenant_id
WHERE (t.rent IS NOT NULL OR t.rental_start_date IS NOT NULL OR t.rental_end_date IS NOT NULL)
  AND l.id IS NULL;

-- Migrate property_tenants with rental data but no corresponding lease
INSERT INTO leases (
    property_id,
    tenant_id,
    unit_id,
    rent_amount,
    deposit_amount,
    start_date,
    end_date,
    rental_type,
    rental_frequency,
    status,
    created_at,
    updated_at
)
SELECT 
    pt.property_id,
    pt.tenant_id,
    u.id as unit_id, -- Try to find unit for this tenant-property combination
    pt.rent_amount,
    pt.deposit_amount,
    pt.start_date,
    pt.end_date,
    'lease' as rental_type, -- Default to lease for property_tenants
    'monthly' as rental_frequency, -- Default frequency
    'active' as status,
    NOW() as created_at,
    NOW() as updated_at
FROM property_tenants pt
LEFT JOIN units u ON pt.tenant_id = u.tenant_id AND pt.property_id = u.property_id
LEFT JOIN leases l ON pt.tenant_id = l.tenant_id AND pt.property_id = l.property_id
WHERE (pt.rent_amount IS NOT NULL OR pt.deposit_amount IS NOT NULL OR pt.start_date IS NOT NULL OR pt.end_date IS NOT NULL)
  AND l.id IS NULL;

-- ============================================================================
-- STEP 4: UPDATE LEASE RECORDS WITH MISSING DATA
-- ============================================================================

-- Update existing leases with rental_type if missing
UPDATE leases 
SET rental_type = 'lease'
WHERE rental_type IS NULL;

-- Update existing leases with rental_frequency if missing
UPDATE leases 
SET rental_frequency = 'monthly'
WHERE rental_frequency IS NULL;

-- Update existing leases with maintenance_fee if missing
UPDATE leases 
SET maintenance_fee = 0.00
WHERE maintenance_fee IS NULL;

-- Update existing leases with advance_amount if missing
UPDATE leases 
SET advance_amount = 0.00
WHERE advance_amount IS NULL;

-- ============================================================================
-- STEP 5: ADD INDEXES FOR PERFORMANCE
-- ============================================================================

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leases_tenant_id ON leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_unit_id ON leases(unit_id);
CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status);
CREATE INDEX IF NOT EXISTS idx_leases_rental_type ON leases(rental_type);
CREATE INDEX IF NOT EXISTS idx_leases_start_date ON leases(start_date);
CREATE INDEX IF NOT EXISTS idx_leases_end_date ON leases(end_date);

-- ============================================================================
-- STEP 6: VERIFICATION QUERIES
-- ============================================================================

-- Log migration results
DO $$
DECLARE
    tenants_migrated INTEGER;
    units_migrated INTEGER;
    property_tenants_migrated INTEGER;
    total_leases INTEGER;
BEGIN
    -- Count migrated records
    SELECT COUNT(*) INTO tenants_migrated FROM backup_tenants_rental_data;
    SELECT COUNT(*) INTO units_migrated FROM backup_units_rental_data;
    SELECT COUNT(*) INTO property_tenants_migrated FROM backup_property_tenants_rental_data;
    SELECT COUNT(*) INTO total_leases FROM leases;
    
    -- Log the results
    RAISE NOTICE 'Migration completed successfully:';
    RAISE NOTICE '- Tenants with rental data: %', tenants_migrated;
    RAISE NOTICE '- Units with rental data: %', units_migrated;
    RAISE NOTICE '- Property_tenants with rental data: %', property_tenants_migrated;
    RAISE NOTICE '- Total leases after migration: %', total_leases;
END $$; 