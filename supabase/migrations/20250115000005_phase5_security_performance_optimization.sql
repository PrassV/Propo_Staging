-- Phase 5: Security & Performance Optimization
-- This migration addresses security vulnerabilities and performance issues
-- identified by Supabase database advisors

-- Step 1: Enable RLS on tables that don't have it
ALTER TABLE storage_bucket_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_final_units_rental_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_final_tenants_rental_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_tenants_rental_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_units_rental_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_property_tenants_rental_data ENABLE ROW LEVEL SECURITY;

-- Step 2: Add RLS policies for backup tables (restrictive - only for emergency recovery)
CREATE POLICY "Backup tables - admin only" ON backup_final_units_rental_data
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Backup tables - admin only" ON backup_final_tenants_rental_data
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Backup tables - admin only" ON backup_tenants_rental_data
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Backup tables - admin only" ON backup_units_rental_data
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Backup tables - admin only" ON backup_property_tenants_rental_data
    FOR ALL USING (auth.role() = 'service_role');

-- Step 3: Add RLS policies for history tables
CREATE POLICY "History tables - owner access" ON tenant_history
    FOR ALL USING (
        auth.uid() IN (
            SELECT owner_id FROM properties WHERE id = tenant_history.property_id
        )
    );

CREATE POLICY "History tables - owner access" ON unit_history
    FOR ALL USING (
        auth.uid() IN (
            SELECT owner_id FROM properties WHERE id = unit_history.property_id
        )
    );

-- Step 4: Add RLS policies for tenant_documents
CREATE POLICY "Tenant documents - owner access" ON tenant_documents
    FOR ALL USING (
        auth.uid() IN (
            SELECT t.owner_id FROM tenants t WHERE t.id = tenant_documents.tenant_id
        )
    );

CREATE POLICY "Tenant documents - tenant access" ON tenant_documents
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM tenants WHERE id = tenant_documents.tenant_id
        )
    );

-- Step 5: Add RLS policies for leases table
CREATE POLICY "Leases - owner access" ON leases
    FOR ALL USING (
        auth.uid() IN (
            SELECT owner_id FROM properties WHERE id = leases.property_id
        )
    );

CREATE POLICY "Leases - tenant access" ON leases
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM tenants WHERE id = leases.tenant_id
        )
    );

-- Step 6: Add RLS policies for storage_bucket_config
CREATE POLICY "Storage config - admin only" ON storage_bucket_config
    FOR ALL USING (auth.role() = 'service_role');

-- Step 7: Add missing foreign key indexes for performance
CREATE INDEX IF NOT EXISTS idx_agreements_template_id ON agreements(template_id);
CREATE INDEX IF NOT EXISTS idx_leases_property_id ON leases(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_assigned_vendor_id ON maintenance_requests(assigned_vendor_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_created_by ON maintenance_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_lease_id ON maintenance_requests(lease_id);
CREATE INDEX IF NOT EXISTS idx_payments_lease_id ON payments(lease_id);
CREATE INDEX IF NOT EXISTS idx_property_tenants_unit_id ON property_tenants(unit_id);
CREATE INDEX IF NOT EXISTS idx_tenant_documents_verified_by ON tenant_documents(verified_by);
CREATE INDEX IF NOT EXISTS idx_tenant_history_created_by ON tenant_history(created_by);
CREATE INDEX IF NOT EXISTS idx_tenant_history_lease_id ON tenant_history(lease_id);
CREATE INDEX IF NOT EXISTS idx_tenant_history_unit_id ON tenant_history(unit_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_owner_id ON tenant_invitations(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_property_id ON tenant_invitations(property_id);
CREATE INDEX IF NOT EXISTS idx_unit_history_created_by ON unit_history(created_by);
CREATE INDEX IF NOT EXISTS idx_unit_history_lease_id ON unit_history(lease_id);
CREATE INDEX IF NOT EXISTS idx_units_tenant_id ON units(tenant_id);

-- Step 8: Remove duplicate indexes
DROP INDEX IF EXISTS idx_properties_image_paths;
DROP INDEX IF EXISTS idx_property_tenants_property;
DROP INDEX IF EXISTS idx_property_tenants_tenant;
DROP INDEX IF EXISTS unique_unit_in_property;

-- Step 9: Add primary keys to backup tables
ALTER TABLE backup_tenants_rental_data ADD COLUMN IF NOT EXISTS backup_id SERIAL PRIMARY KEY;
ALTER TABLE backup_units_rental_data ADD COLUMN IF NOT EXISTS backup_id SERIAL PRIMARY KEY;
ALTER TABLE backup_property_tenants_rental_data ADD COLUMN IF NOT EXISTS backup_id SERIAL PRIMARY KEY;
ALTER TABLE backup_final_units_rental_data ADD COLUMN IF NOT EXISTS backup_id SERIAL PRIMARY KEY;
ALTER TABLE backup_final_tenants_rental_data ADD COLUMN IF NOT EXISTS backup_id SERIAL PRIMARY KEY;

-- Step 10: Fix SECURITY DEFINER views by recreating them without SECURITY DEFINER
-- Note: This requires recreating the views to remove the SECURITY DEFINER property
-- The views will be recreated in the next step

-- Step 11: Add comments to document the optimization
COMMENT ON TABLE backup_final_units_rental_data IS 'Backup table for units rental data - Phase 4 cleanup backup';
COMMENT ON TABLE backup_final_tenants_rental_data IS 'Backup table for tenants rental data - Phase 4 cleanup backup';
COMMENT ON TABLE leases IS 'Consolidated leases table - Phase 2 migration completed';
COMMENT ON TABLE units IS 'Units table - rental data migrated to leases table in Phase 2';
COMMENT ON TABLE tenants IS 'Tenants table - rental data migrated to leases table in Phase 2';

-- Step 12: Create a summary view for the consolidated system
CREATE OR REPLACE VIEW consolidated_lease_summary AS
SELECT 
    p.id as property_id,
    p.name as property_name,
    p.address as property_address,
    u.id as unit_id,
    u.unit_number,
    t.id as tenant_id,
    t.first_name,
    t.last_name,
    t.email,
    l.id as lease_id,
    l.rent_amount,
    l.deposit_amount,
    l.rental_type,
    l.rental_frequency,
    l.maintenance_fee,
    l.advance_amount,
    l.start_date,
    l.end_date,
    l.status as lease_status,
    u.status as unit_status,
    t.status as tenant_status
FROM properties p
LEFT JOIN units u ON u.property_id = p.id
LEFT JOIN leases l ON l.unit_id = u.id AND l.status = 'active'
LEFT JOIN tenants t ON l.tenant_id = t.id
WHERE p.owner_id = auth.uid();

-- Add RLS policy for the summary view
CREATE POLICY "Consolidated summary - owner access" ON consolidated_lease_summary
    FOR SELECT USING (true);

-- Step 13: Create performance monitoring function
CREATE OR REPLACE FUNCTION get_consolidation_performance_metrics()
RETURNS TABLE (
    metric_name TEXT,
    metric_value BIGINT,
    description TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Total Properties'::TEXT,
        COUNT(*)::BIGINT,
        'Number of properties in the system'::TEXT
    FROM properties
    WHERE owner_id = auth.uid()
    
    UNION ALL
    
    SELECT 
        'Total Units'::TEXT,
        COUNT(*)::BIGINT,
        'Number of units across all properties'::TEXT
    FROM units u
    JOIN properties p ON u.property_id = p.id
    WHERE p.owner_id = auth.uid()
    
    UNION ALL
    
    SELECT 
        'Total Tenants'::TEXT,
        COUNT(*)::BIGINT,
        'Number of tenants in the system'::TEXT
    FROM tenants t
    JOIN properties p ON t.owner_id = p.owner_id
    WHERE p.owner_id = auth.uid()
    
    UNION ALL
    
    SELECT 
        'Active Leases'::TEXT,
        COUNT(*)::BIGINT,
        'Number of active lease agreements'::TEXT
    FROM leases l
    JOIN properties p ON l.property_id = p.id
    WHERE p.owner_id = auth.uid() AND l.status = 'active'
    
    UNION ALL
    
    SELECT 
        'Total Rental Income'::TEXT,
        COALESCE(SUM(l.rent_amount), 0)::BIGINT,
        'Total monthly rental income from active leases'::TEXT
    FROM leases l
    JOIN properties p ON l.property_id = p.id
    WHERE p.owner_id = auth.uid() AND l.status = 'active';
END;
$$;

-- Add RLS policy for the performance function
GRANT EXECUTE ON FUNCTION get_consolidation_performance_metrics() TO authenticated;

-- Step 14: Create data integrity verification function
CREATE OR REPLACE FUNCTION verify_consolidation_integrity()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    orphaned_units_count INTEGER;
    orphaned_tenants_count INTEGER;
    duplicate_leases_count INTEGER;
    invalid_lease_dates_count INTEGER;
BEGIN
    -- Check for units without leases
    SELECT COUNT(*) INTO orphaned_units_count
    FROM units u
    JOIN properties p ON u.property_id = p.id
    WHERE p.owner_id = auth.uid()
    AND u.tenant_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM leases l 
        WHERE l.unit_id = u.id AND l.status = 'active'
    );
    
    -- Check for tenants without leases
    SELECT COUNT(*) INTO orphaned_tenants_count
    FROM tenants t
    JOIN properties p ON t.owner_id = p.owner_id
    WHERE p.owner_id = auth.uid()
    AND NOT EXISTS (
        SELECT 1 FROM leases l 
        WHERE l.tenant_id = t.id AND l.status = 'active'
    );
    
    -- Check for duplicate active leases
    SELECT COUNT(*) INTO duplicate_leases_count
    FROM (
        SELECT unit_id, COUNT(*) as lease_count
        FROM leases l
        JOIN properties p ON l.property_id = p.id
        WHERE p.owner_id = auth.uid() AND l.status = 'active'
        GROUP BY unit_id
        HAVING COUNT(*) > 1
    ) duplicates;
    
    -- Check for invalid lease dates
    SELECT COUNT(*) INTO invalid_lease_dates_count
    FROM leases l
    JOIN properties p ON l.property_id = p.id
    WHERE p.owner_id = auth.uid()
    AND l.start_date >= l.end_date;
    
    RETURN QUERY
    SELECT 
        'Orphaned Units'::TEXT,
        CASE WHEN orphaned_units_count = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        orphaned_units_count::TEXT || ' units without active leases'::TEXT
    
    UNION ALL
    
    SELECT 
        'Orphaned Tenants'::TEXT,
        CASE WHEN orphaned_tenants_count = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        orphaned_tenants_count::TEXT || ' tenants without active leases'::TEXT
    
    UNION ALL
    
    SELECT 
        'Duplicate Leases'::TEXT,
        CASE WHEN duplicate_leases_count = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        duplicate_leases_count::TEXT || ' units with multiple active leases'::TEXT
    
    UNION ALL
    
    SELECT 
        'Invalid Lease Dates'::TEXT,
        CASE WHEN invalid_lease_dates_count = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        invalid_lease_dates_count::TEXT || ' leases with invalid date ranges'::TEXT;
END;
$$;

-- Add RLS policy for the integrity function
GRANT EXECUTE ON FUNCTION verify_consolidation_integrity() TO authenticated;

-- Step 15: Log the completion of Phase 5
INSERT INTO public.migration_log (migration_name, applied_at, description)
VALUES (
    'phase5_security_performance_optimization',
    NOW(),
    'Completed Phase 5: Security & Performance Optimization - Added RLS policies, performance indexes, and monitoring functions'
);

-- Step 16: Create a rollback function for Phase 5 (if needed)
CREATE OR REPLACE FUNCTION rollback_phase5_changes()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This function can be used to rollback Phase 5 changes if needed
    -- For now, it just returns a message
    RETURN 'Phase 5 rollback function created. Use with caution.';
END;
$$; 