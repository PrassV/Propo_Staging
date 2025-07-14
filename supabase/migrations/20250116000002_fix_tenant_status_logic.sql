-- Migration: Fix tenant status logic string formatting issue
-- This migration fixes the string formatting issue in the has_recent_active_lease function

-- Fix the has_recent_active_lease function with proper date arithmetic
CREATE OR REPLACE FUNCTION has_recent_active_lease(tenant_uuid UUID, months_back INTEGER DEFAULT 3)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM leases l
        WHERE l.tenant_id = tenant_uuid
        AND l.status IN ('active', 'terminated', 'expired')
        AND (
            l.end_date IS NULL 
            OR l.end_date >= (CURRENT_DATE - INTERVAL '1 month' * months_back)
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check if tenant can be set to inactive
CREATE OR REPLACE FUNCTION can_set_tenant_inactive(tenant_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if tenant has any active leases
    IF has_active_lease(tenant_uuid) THEN
        RETURN FALSE;
    END IF;
    
    -- Check if tenant has had any recent active leases in the last 3 months
    IF has_recent_active_lease(tenant_uuid, 3) THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get tenant status validation summary
CREATE OR REPLACE FUNCTION get_tenant_status_validation_summary(tenant_uuid UUID)
RETURNS TABLE (
    current_status tenant_status,
    has_active_lease BOOLEAN,
    has_recent_lease BOOLEAN,
    can_be_active BOOLEAN,
    can_be_inactive BOOLEAN,
    can_be_unassigned BOOLEAN,
    current_assignment_info JSON
) AS $$
DECLARE
    current_tenant_status tenant_status;
    active_lease_exists BOOLEAN;
    recent_lease_exists BOOLEAN;
    assignment_info JSON;
BEGIN
    -- Get current tenant status
    SELECT t.status INTO current_tenant_status
    FROM tenants t
    WHERE t.id = tenant_uuid;
    
    -- Check lease status
    active_lease_exists := has_active_lease(tenant_uuid);
    recent_lease_exists := has_recent_active_lease(tenant_uuid, 3);
    
    -- Get current assignment info
    SELECT json_agg(
        json_build_object(
            'unit_id', unit_id,
            'property_id', property_id,
            'lease_id', lease_id,
            'unit_number', unit_number,
            'property_name', property_name
        )
    ) INTO assignment_info
    FROM get_current_unit_assignment(tenant_uuid);
    
    -- Apply business logic rules
    RETURN QUERY SELECT
        current_tenant_status,
        active_lease_exists,
        recent_lease_exists,
        active_lease_exists as can_be_active,  -- Can be active if has active lease
        NOT recent_lease_exists as can_be_inactive,  -- Can be inactive if no recent lease
        NOT active_lease_exists as can_be_unassigned,  -- Can be unassigned if no active lease
        COALESCE(assignment_info, '[]'::JSON);
END;
$$ LANGUAGE plpgsql;

-- Function to get next eligible status for tenant
CREATE OR REPLACE FUNCTION get_next_eligible_tenant_status(tenant_uuid UUID)
RETURNS TEXT[] AS $$
DECLARE
    summary RECORD;
    eligible_statuses TEXT[] := '{}';
BEGIN
    -- Get validation summary
    SELECT * INTO summary
    FROM get_tenant_status_validation_summary(tenant_uuid);
    
    -- Build array of eligible statuses
    IF summary.can_be_active THEN
        eligible_statuses := array_append(eligible_statuses, 'active');
    END IF;
    
    IF summary.can_be_inactive THEN
        eligible_statuses := array_append(eligible_statuses, 'inactive');
    END IF;
    
    IF summary.can_be_unassigned THEN
        eligible_statuses := array_append(eligible_statuses, 'unassigned');
    END IF;
    
    RETURN eligible_statuses;
END;
$$ LANGUAGE plpgsql;

-- Function to get tenant's lease termination date for inactive status calculation
CREATE OR REPLACE FUNCTION get_tenant_last_lease_end_date(tenant_uuid UUID)
RETURNS DATE AS $$
DECLARE
    last_end_date DATE;
BEGIN
    SELECT MAX(COALESCE(l.end_date, l.created_at::DATE))
    INTO last_end_date
    FROM leases l
    WHERE l.tenant_id = tenant_uuid
    AND l.status IN ('terminated', 'expired', 'completed');
    
    RETURN last_end_date;
END;
$$ LANGUAGE plpgsql;

-- Function to check how many months since last active lease
CREATE OR REPLACE FUNCTION months_since_last_active_lease(tenant_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    last_end_date DATE;
    months_diff INTEGER;
BEGIN
    last_end_date := get_tenant_last_lease_end_date(tenant_uuid);
    
    IF last_end_date IS NULL THEN
        RETURN NULL; -- No previous leases
    END IF;
    
    -- Calculate months difference
    months_diff := EXTRACT(EPOCH FROM (CURRENT_DATE - last_end_date)) / (30 * 24 * 3600);
    
    RETURN months_diff;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION can_set_tenant_inactive(UUID) IS 'Check if tenant can be set to inactive status';
COMMENT ON FUNCTION get_tenant_status_validation_summary(UUID) IS 'Get comprehensive tenant status validation summary';
COMMENT ON FUNCTION get_next_eligible_tenant_status(UUID) IS 'Get array of eligible statuses for tenant';
COMMENT ON FUNCTION get_tenant_last_lease_end_date(UUID) IS 'Get the last lease end date for tenant';
COMMENT ON FUNCTION months_since_last_active_lease(UUID) IS 'Get months since last active lease ended';

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: Fixed tenant status logic string formatting';
    RAISE NOTICE 'Added helper functions for inactive tenant logic';
    RAISE NOTICE 'Functions added: can_set_tenant_inactive, get_tenant_status_validation_summary, get_next_eligible_tenant_status';
END $$; 