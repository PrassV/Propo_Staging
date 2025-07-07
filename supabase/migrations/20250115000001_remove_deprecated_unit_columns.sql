-- Migration: Remove deprecated rent and deposit columns from units table
-- Date: 2025-01-15
-- Purpose: Align database schema with lease-centric architecture
-- 
-- Background: In the lease-centric architecture, financial terms (rent, deposit)
-- belong in the leases table, not the units table. The units table should only
-- contain physical characteristics of the unit.

-- Safety check: Log any existing data before removal
-- (This is informational - data should be migrated to leases table if needed)
DO $$
DECLARE
    rent_count INTEGER;
    deposit_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO rent_count FROM units WHERE rent IS NOT NULL;
    SELECT COUNT(*) INTO deposit_count FROM units WHERE deposit IS NOT NULL;
    
    RAISE NOTICE 'Units with rent data: %', rent_count;
    RAISE NOTICE 'Units with deposit data: %', deposit_count;
    
    IF rent_count > 0 OR deposit_count > 0 THEN
        RAISE NOTICE 'WARNING: Found % units with rent data and % units with deposit data', rent_count, deposit_count;
        RAISE NOTICE 'These values will be lost. Consider migrating to leases table if needed.';
    END IF;
END $$;

-- Remove the deprecated columns
ALTER TABLE public.units DROP COLUMN IF EXISTS rent;
ALTER TABLE public.units DROP COLUMN IF EXISTS deposit;

-- Add documentation comment
COMMENT ON TABLE public.units IS 'Physical unit information. Financial terms (rent, deposit) are stored in the leases table as part of the lease-centric architecture.';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Successfully removed deprecated rent and deposit columns from units table';
END $$; 