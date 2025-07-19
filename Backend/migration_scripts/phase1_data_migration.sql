-- Phase 1 Data Migration Script
-- Database Consolidation: Migrate rental data to leases table
-- Created: 2025-01-15
-- Purpose: Consolidate rental data from tenants, units, and property_tenants tables into leases table

-- ============================================================================
-- STEP 1: BACKUP EXISTING DATA
-- ============================================================================

-- Create backup tables for all rental data
CREATE TABLE IF NOT EXISTS backup_tenants_rental_data AS
SELECT 
    id,
    rent,
    rental_start_date,
    rental_end_date,
    rental_type,
    rental_frequency,
    maintenance_fee,
    created_at
FROM tenants 
WHERE rent IS NOT NULL 
   OR rental_start_date IS NOT NULL 
   OR rental_end_date IS NOT NULL 
   OR rental_type IS NOT NULL 
   OR rental_frequency IS NOT NULL 
   OR maintenance_fee IS NOT NULL;

CREATE TABLE IF NOT EXISTS backup_units_rental_data AS
SELECT 
    id,
    rent,
    deposit,
    start_date,
    end_date,
    rent_frequency,
    created_at
FROM units 
WHERE rent IS NOT NULL 
   OR deposit IS NOT NULL 
   OR start_date IS NOT NULL 
   OR end_date IS NOT NULL 
   OR rent_frequency IS NOT NULL;

CREATE TABLE IF NOT EXISTS backup_property_tenants_rental_data AS
SELECT 
    id,
    property_id,
    tenant_id,
    unit_id,
    rent_amount,
    deposit_amount,
    start_date,
    end_date,
    created_at
FROM property_tenants 
WHERE rent_amount IS NOT NULL 
   OR deposit_amount IS NOT NULL 
   OR start_date IS NOT NULL 
   OR end_date IS NOT NULL;

-- ============================================================================
-- STEP 2: ADD MISSING FIELDS TO LEASES TABLE
-- ============================================================================

-- Add rental_type field to leases table
ALTER TABLE leases 
ADD COLUMN IF NOT EXISTS rental_type TEXT CHECK (rental_type IN ('rent', 'lease'));

-- Add rental_frequency field to leases table
ALTER TABLE leases 
ADD COLUMN IF NOT EXISTS rental_frequency TEXT CHECK (rental_frequency IN ('monthly', 'quarterly', 'half-yearly', 'yearly'));

-- Add maintenance_fee field to leases table
ALTER TABLE leases 
ADD COLUMN IF NOT EXISTS maintenance_fee NUMERIC;

-- Add advance_amount field to leases table
ALTER TABLE leases 
ADD COLUMN IF NOT EXISTS advance_amount NUMERIC;

-- Add notes field to leases table (if not exists)
ALTER TABLE leases 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================================
-- STEP 3: MIGRATE ORPHANED RENTAL DATA FROM TENANTS TABLE
-- ============================================================================

-- Migrate tenant with rental data but no lease record
INSERT INTO leases (
    property_id,
    tenant_id,
    start_date,
    end_date,
    rent_amount,
    rental_type,
    rental_frequency,
    status,
    created_at,
    updated_at
)
SELECT 
    -- We need to determine property_id - using a default or first property
    (SELECT id FROM properties LIMIT 1) as property_id,
    t.id as tenant_id,
    t.rental_start_date as start_date,
    t.rental_end_date as end_date,
    t.rent as rent_amount,
    t.rental_type,
    t.rental_frequency,
    'active' as status,
    NOW() as created_at,
    NOW() as updated_at
FROM tenants t
LEFT JOIN leases l ON t.id = l.tenant_id
WHERE (t.rent IS NOT NULL OR t.rental_start_date IS NOT NULL OR t.rental_end_date IS NOT NULL)
  AND l.id IS NULL
  AND t.id = '742de726-62fc-460e-8bbf-de839718d2e5'; -- Specific tenant identified

-- ============================================================================
-- STEP 4: MIGRATE ORPHANED RENTAL DATA FROM UNITS TABLE
-- ============================================================================

-- Migrate units with rental data but no lease records
INSERT INTO leases (
    property_id,
    unit_id,
    start_date,
    end_date,
    rent_amount,
    deposit_amount,
    rental_frequency,
    status,
    created_at,
    updated_at
)
SELECT 
    u.property_id,
    u.id as unit_id,
    u.start_date,
    u.end_date,
    u.rent as rent_amount,
    u.deposit as deposit_amount,
    u.rent_frequency,
    'active' as status,
    NOW() as created_at,
    NOW() as updated_at
FROM units u
LEFT JOIN leases l ON u.id = l.unit_id
WHERE (u.rent IS NOT NULL OR u.deposit IS NOT NULL OR u.start_date IS NOT NULL OR u.end_date IS NOT NULL)
  AND l.id IS NULL
  AND u.id IN ('7b1ebf3e-17ba-494e-9a5e-af6b27e2a8a4', '03262432-4b3f-414b-93f2-8807469843f2');

-- ============================================================================
-- STEP 5: UPDATE EXISTING LEASES WITH MISSING DATA
-- ============================================================================

-- Update existing leases with rental_type and frequency from tenants table
UPDATE leases l
SET 
    rental_type = t.rental_type,
    rental_frequency = t.rental_frequency,
    maintenance_fee = t.maintenance_fee,
    updated_at = NOW()
FROM tenants t
WHERE l.tenant_id = t.id
  AND (t.rental_type IS NOT NULL OR t.rental_frequency IS NOT NULL OR t.maintenance_fee IS NOT NULL)
  AND (l.rental_type IS NULL OR l.rental_frequency IS NULL OR l.maintenance_fee IS NULL);

-- Update existing leases with frequency from units table
UPDATE leases l
SET 
    rental_frequency = u.rent_frequency,
    updated_at = NOW()
FROM units u
WHERE l.unit_id = u.id
  AND u.rent_frequency IS NOT NULL
  AND l.rental_frequency IS NULL;

-- ============================================================================
-- STEP 6: VALIDATION QUERIES
-- ============================================================================

-- Verify no data loss
SELECT 'Tenants with rental data' as check_type, COUNT(*) as count
FROM tenants 
WHERE rent IS NOT NULL 
   OR rental_start_date IS NOT NULL 
   OR rental_end_date IS NOT NULL 
   OR rental_type IS NOT NULL 
   OR rental_frequency IS NOT NULL 
   OR maintenance_fee IS NOT NULL
UNION ALL
SELECT 'Units with rental data' as check_type, COUNT(*) as count
FROM units 
WHERE rent IS NOT NULL 
   OR deposit IS NOT NULL 
   OR start_date IS NOT NULL 
   OR end_date IS NOT NULL 
   OR rent_frequency IS NOT NULL
UNION ALL
SELECT 'Leases created' as check_type, COUNT(*) as count
FROM leases;

-- Check for any remaining orphaned rental data
SELECT 'Orphaned tenant rental data' as check_type, COUNT(*) as count
FROM tenants t
LEFT JOIN leases l ON t.id = l.tenant_id
WHERE (t.rent IS NOT NULL OR t.rental_start_date IS NOT NULL OR t.rental_end_date IS NOT NULL)
  AND l.id IS NULL
UNION ALL
SELECT 'Orphaned unit rental data' as check_type, COUNT(*) as count
FROM units u
LEFT JOIN leases l ON u.id = l.unit_id
WHERE (u.rent IS NOT NULL OR u.deposit IS NOT NULL OR u.start_date IS NOT NULL OR u.end_date IS NOT NULL)
  AND l.id IS NULL;

-- ============================================================================
-- STEP 7: ROLLBACK SCRIPT (COMMENTED OUT - UNCOMMENT IF NEEDED)
-- ============================================================================

/*
-- ROLLBACK SCRIPT - UNCOMMENT ONLY IF ROLLBACK IS NEEDED

-- Restore rental data to tenants table
UPDATE tenants t
SET 
    rent = l.rent_amount,
    rental_start_date = l.start_date,
    rental_end_date = l.end_date,
    rental_type = l.rental_type,
    rental_frequency = l.rental_frequency,
    maintenance_fee = l.maintenance_fee,
    updated_at = NOW()
FROM leases l
WHERE t.id = l.tenant_id
  AND l.created_at >= (SELECT MAX(created_at) FROM backup_tenants_rental_data);

-- Restore rental data to units table
UPDATE units u
SET 
    rent = l.rent_amount,
    deposit = l.deposit_amount,
    start_date = l.start_date,
    end_date = l.end_date,
    rent_frequency = l.rental_frequency,
    updated_at = NOW()
FROM leases l
WHERE u.id = l.unit_id
  AND l.created_at >= (SELECT MAX(created_at) FROM backup_units_rental_data);

-- Delete newly created leases
DELETE FROM leases 
WHERE created_at >= (SELECT MAX(created_at) FROM backup_tenants_rental_data);

-- Drop backup tables
DROP TABLE IF EXISTS backup_tenants_rental_data;
DROP TABLE IF EXISTS backup_units_rental_data;
DROP TABLE IF EXISTS backup_property_tenants_rental_data;
*/

-- ============================================================================
-- STEP 8: CLEANUP (COMMENTED OUT - UNCOMMENT AFTER VALIDATION)
-- ============================================================================

/*
-- REMOVE RENTAL FIELDS FROM TENANTS TABLE (AFTER VALIDATION)
-- ALTER TABLE tenants DROP COLUMN IF EXISTS rent;
-- ALTER TABLE tenants DROP COLUMN IF EXISTS rental_start_date;
-- ALTER TABLE tenants DROP COLUMN IF EXISTS rental_end_date;
-- ALTER TABLE tenants DROP COLUMN IF EXISTS rental_type;
-- ALTER TABLE tenants DROP COLUMN IF EXISTS rental_frequency;
-- ALTER TABLE tenants DROP COLUMN IF EXISTS maintenance_fee;

-- REMOVE RENTAL FIELDS FROM UNITS TABLE (AFTER VALIDATION)
-- ALTER TABLE units DROP COLUMN IF EXISTS rent;
-- ALTER TABLE units DROP COLUMN IF EXISTS deposit;
-- ALTER TABLE units DROP COLUMN IF EXISTS start_date;
-- ALTER TABLE units DROP COLUMN IF EXISTS end_date;
-- ALTER TABLE units DROP COLUMN IF EXISTS rent_frequency;

-- DROP PROPERTY_TENANTS TABLE (AFTER VALIDATION)
-- DROP TABLE IF EXISTS property_tenants;
*/ 