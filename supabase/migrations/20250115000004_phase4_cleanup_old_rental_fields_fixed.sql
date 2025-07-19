-- Phase 4: Cleanup Old Rental Fields (Fixed)
-- This migration removes rental-related fields from units and tenants tables
-- after ensuring all data has been properly migrated to the consolidated leases table

-- Step 1: Verify data migration completeness
DO $$
DECLARE
    units_with_rental_data INTEGER;
    tenants_with_rental_data INTEGER;
    total_leases INTEGER;
BEGIN
    -- Check if there are any units with rental data that haven't been migrated
    SELECT COUNT(*) INTO units_with_rental_data
    FROM units u
    WHERE (u.rent IS NOT NULL OR u.deposit IS NOT NULL OR u.start_date IS NOT NULL OR u.end_date IS NOT NULL OR u.rent_frequency IS NOT NULL)
    AND NOT EXISTS (
        SELECT 1 FROM leases l 
        WHERE l.unit_id = u.id
    );
    
    -- Check if there are any tenants with rental data that haven't been migrated
    SELECT COUNT(*) INTO tenants_with_rental_data
    FROM tenants t
    WHERE (t.rent IS NOT NULL OR t.rental_start_date IS NOT NULL OR t.rental_end_date IS NOT NULL OR t.rental_frequency IS NOT NULL OR t.rental_type IS NOT NULL OR t.maintenance_fee IS NOT NULL OR t.lease_end_date IS NOT NULL)
    AND NOT EXISTS (
        SELECT 1 FROM leases l 
        WHERE l.tenant_id = t.id
    );
    
    -- Get total leases count
    SELECT COUNT(*) INTO total_leases FROM leases;
    
    -- Log verification results
    RAISE NOTICE 'Data Migration Verification:';
    RAISE NOTICE 'Total leases in consolidated table: %', total_leases;
    RAISE NOTICE 'Units with unmigrated rental data: %', units_with_rental_data;
    RAISE NOTICE 'Tenants with unmigrated rental data: %', tenants_with_rental_data;
    
    -- If there's unmigrated data, create a warning but continue
    IF units_with_rental_data > 0 OR tenants_with_rental_data > 0 THEN
        RAISE WARNING 'Found unmigrated rental data. Consider reviewing before cleanup.';
    END IF;
END $$;

-- Step 2: Create final backup of any remaining rental data
CREATE TABLE IF NOT EXISTS backup_final_units_rental_data AS
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
WHERE rent IS NOT NULL OR deposit IS NOT NULL OR start_date IS NOT NULL OR end_date IS NOT NULL OR rent_frequency IS NOT NULL;

CREATE TABLE IF NOT EXISTS backup_final_tenants_rental_data AS
SELECT 
    id,
    name,
    rent,
    rental_start_date,
    rental_end_date,
    rental_type,
    rental_frequency,
    maintenance_fee,
    lease_end_date,
    created_at,
    NOW() as backup_created_at
FROM tenants 
WHERE rent IS NOT NULL OR rental_start_date IS NOT NULL OR rental_end_date IS NOT NULL OR rental_frequency IS NOT NULL OR rental_type IS NOT NULL OR maintenance_fee IS NOT NULL OR lease_end_date IS NOT NULL;

-- Step 3: Update dashboard_summary view to use leases table instead of unit rental data
DROP VIEW IF EXISTS dashboard_summary;

CREATE VIEW dashboard_summary AS
SELECT 
    p.owner_id,
    count(DISTINCT p.id) AS total_properties,
    count(DISTINCT u.id) AS total_units,
    count(DISTINCT t.id) AS total_tenants,
    count(DISTINCT
        CASE
            WHEN (u.status = 'Occupied'::lease_status) THEN u.id
            ELSE NULL::uuid
        END) AS total_rented_units,
    count(DISTINCT
        CASE
            WHEN (u.status = 'Vacant'::lease_status) THEN u.id
            ELSE NULL::uuid
        END) AS total_vacant_units,
    (((count(DISTINCT
        CASE
            WHEN (u.status = 'Occupied'::lease_status) THEN u.id
            ELSE NULL::uuid
        END))::numeric * 100.0) / (NULLIF(count(DISTINCT u.id), 0))::numeric) AS occupancy_rate,
    sum(
        CASE
            WHEN (u.status = 'Occupied'::lease_status) THEN COALESCE(l.rent_amount, 0)
            ELSE (0)::numeric
        END) AS monthly_rental_income,
    (sum(
        CASE
            WHEN (u.status = 'Occupied'::lease_status) THEN COALESCE(l.rent_amount, 0)
            ELSE (0)::numeric
        END) * (12)::numeric) AS yearly_rental_income,
    sum(COALESCE(l.deposit_amount, 0)) AS total_security_deposits
FROM ((properties p
    LEFT JOIN units u ON ((p.id = u.property_id)))
    LEFT JOIN tenants t ON ((u.tenant_id = t.id)))
    LEFT JOIN leases l ON ((u.id = l.unit_id AND l.status = 'active'))
GROUP BY p.owner_id;

-- Step 4: Remove rental-related columns from units table
-- Note: We keep tenant_id as it's used for unit assignment, not rental data
ALTER TABLE units 
DROP COLUMN IF EXISTS rent,
DROP COLUMN IF EXISTS deposit,
DROP COLUMN IF EXISTS start_date,
DROP COLUMN IF EXISTS end_date,
DROP COLUMN IF EXISTS rent_frequency;

-- Step 5: Remove rental-related columns from tenants table
ALTER TABLE tenants 
DROP COLUMN IF EXISTS rent,
DROP COLUMN IF EXISTS rental_start_date,
DROP COLUMN IF EXISTS rental_end_date,
DROP COLUMN IF EXISTS rental_frequency,
DROP COLUMN IF EXISTS rental_type,
DROP COLUMN IF EXISTS maintenance_fee,
DROP COLUMN IF EXISTS lease_end_date;

-- Step 6: Update any remaining references to use leases table
-- Update maintenance_requests to use lease_id instead of unit rental data
UPDATE maintenance_requests 
SET lease_id = (
    SELECT l.id 
    FROM leases l 
    WHERE l.unit_id = maintenance_requests.unit_id 
    AND l.tenant_id = maintenance_requests.tenant_id
    AND l.status = 'active'
    LIMIT 1
)
WHERE lease_id IS NULL 
AND unit_id IS NOT NULL 
AND tenant_id IS NOT NULL;

-- Step 7: Add comments to document the cleanup
COMMENT ON TABLE units IS 'Units table - rental data has been migrated to leases table';
COMMENT ON TABLE tenants IS 'Tenants table - rental data has been migrated to leases table';
COMMENT ON TABLE leases IS 'Consolidated leases table containing all rental agreements and data';

-- Step 8: Create indexes for better performance on the cleaned tables
CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
CREATE INDEX IF NOT EXISTS idx_tenants_owner_id ON tenants(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- Step 9: Verification queries
DO $$
DECLARE
    units_after_cleanup INTEGER;
    tenants_after_cleanup INTEGER;
    leases_count INTEGER;
BEGIN
    -- Count records after cleanup
    SELECT COUNT(*) INTO units_after_cleanup FROM units;
    SELECT COUNT(*) INTO tenants_after_cleanup FROM tenants;
    SELECT COUNT(*) INTO leases_count FROM leases;
    
    RAISE NOTICE 'Cleanup Verification:';
    RAISE NOTICE 'Units after cleanup: %', units_after_cleanup;
    RAISE NOTICE 'Tenants after cleanup: %', tenants_after_cleanup;
    RAISE NOTICE 'Total leases: %', leases_count;
    
    -- Verify no rental columns exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'units' 
        AND column_name IN ('rent', 'deposit', 'start_date', 'end_date', 'rent_frequency')
    ) THEN
        RAISE EXCEPTION 'Rental columns still exist in units table';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' 
        AND column_name IN ('rent', 'rental_start_date', 'rental_end_date', 'rental_frequency', 'rental_type', 'maintenance_fee', 'lease_end_date')
    ) THEN
        RAISE EXCEPTION 'Rental columns still exist in tenants table';
    END IF;
    
    RAISE NOTICE 'Phase 4 cleanup completed successfully!';
END $$; 