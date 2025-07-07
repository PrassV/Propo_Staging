-- Verification script for unit table migration
-- Run this BEFORE applying the migration to ensure no data loss

-- Check if any units have rent data
SELECT 
    COUNT(*) as units_with_rent,
    COUNT(CASE WHEN rent IS NOT NULL THEN 1 END) as non_null_rent_count,
    AVG(rent) as avg_rent
FROM units 
WHERE rent IS NOT NULL;

-- Check if any units have deposit data  
SELECT 
    COUNT(*) as units_with_deposit,
    COUNT(CASE WHEN deposit IS NOT NULL THEN 1 END) as non_null_deposit_count,
    AVG(deposit) as avg_deposit
FROM units 
WHERE deposit IS NOT NULL;

-- Show sample of units with rent or deposit data (if any)
SELECT 
    id,
    unit_number,
    property_id,
    rent,
    deposit,
    created_at
FROM units 
WHERE rent IS NOT NULL OR deposit IS NOT NULL
LIMIT 10;

-- Summary count
SELECT 
    COUNT(*) as total_units,
    COUNT(CASE WHEN rent IS NOT NULL OR deposit IS NOT NULL THEN 1 END) as units_with_financial_data
FROM units; 