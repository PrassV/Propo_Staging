-- Migration: Enforce Tenant Status Business Logic Rules
-- This migration adds comprehensive business logic enforcement for tenant status
-- and lease management according to the specified requirements.

-- ==============================================================================
-- PART 1: ADD HELPER FUNCTIONS FOR BUSINESS LOGIC VALIDATION
-- ==============================================================================

-- Function to check if a tenant has any active leases
CREATE OR REPLACE FUNCTION has_active_lease(tenant_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM leases l
        WHERE l.tenant_id = tenant_uuid
        AND l.status = 'active'
        AND (l.end_date IS NULL OR l.end_date >= CURRENT_DATE)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check if a tenant has had any active lease in the last N months
CREATE OR REPLACE FUNCTION has_recent_active_lease(tenant_uuid UUID, months_back INTEGER DEFAULT 3)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM leases l
        WHERE l.tenant_id = tenant_uuid
        AND l.status IN ('active', 'terminated', 'expired')
        AND (
            l.end_date IS NULL 
            OR l.end_date >= (CURRENT_DATE - INTERVAL '%s months', months_back)
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get current unit assignment for a tenant
CREATE OR REPLACE FUNCTION get_current_unit_assignment(tenant_uuid UUID)
RETURNS TABLE (
    unit_id UUID,
    property_id UUID,
    lease_id UUID,
    unit_number TEXT,
    property_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as unit_id,
        u.property_id,
        l.id as lease_id,
        u.unit_number,
        p.property_name
    FROM leases l
    JOIN units u ON l.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE l.tenant_id = tenant_uuid
    AND l.status = 'active'
    AND (l.end_date IS NULL OR l.end_date >= CURRENT_DATE)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- PART 2: ENHANCED TENANT STATUS VALIDATION FUNCTIONS
-- ==============================================================================

-- Function to validate tenant status change
CREATE OR REPLACE FUNCTION validate_tenant_status_change(
    tenant_uuid UUID,
    new_status tenant_status
) RETURNS BOOLEAN AS $$
DECLARE
    has_active_lease_val BOOLEAN;
    has_recent_lease_val BOOLEAN;
    current_assignment RECORD;
BEGIN
    -- Get current lease status
    SELECT * INTO current_assignment FROM get_current_unit_assignment(tenant_uuid);
    has_active_lease_val := has_active_lease(tenant_uuid);
    has_recent_lease_val := has_recent_active_lease(tenant_uuid, 3);
    
    -- Apply business logic rules
    CASE new_status
        WHEN 'unassigned' THEN
            -- Unassigned tenants should not have active leases
            IF has_active_lease_val THEN
                RAISE EXCEPTION 'Cannot set tenant to unassigned: tenant has active lease. Terminate lease first.';
            END IF;
            
        WHEN 'active' THEN
            -- Active tenants should have a current unit assignment
            IF NOT has_active_lease_val THEN
                RAISE EXCEPTION 'Cannot set tenant to active: tenant must have an active lease assignment.';
            END IF;
            
        WHEN 'inactive' THEN
            -- Inactive tenants should not have recent active leases (last 3 months)
            IF has_recent_lease_val THEN
                RAISE EXCEPTION 'Cannot set tenant to inactive: tenant has had active lease in last 3 months.';
            END IF;
    END CASE;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- PART 3: ENHANCED TENANT HISTORY FUNCTIONS
-- ==============================================================================

-- Enhanced function to get comprehensive tenant history
CREATE OR REPLACE FUNCTION get_tenant_history(tenant_uuid UUID, limit_records INTEGER DEFAULT 50)
RETURNS TABLE (
    history_id UUID,
    action history_action,
    action_date DATE,
    property_name TEXT,
    unit_number TEXT,
    lease_id UUID,
    start_date DATE,
    end_date DATE,
    rent_amount DECIMAL,
    deposit_amount DECIMAL,
    payment_amount DECIMAL,
    termination_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        th.id as history_id,
        th.action,
        th.action_date,
        p.property_name,
        u.unit_number,
        th.lease_id,
        th.start_date,
        th.end_date,
        th.rent_amount,
        th.deposit_amount,
        th.payment_amount,
        th.termination_reason,
        th.notes,
        th.created_at
    FROM tenant_history th
    LEFT JOIN properties p ON th.property_id = p.id
    LEFT JOIN units u ON th.unit_id = u.id
    WHERE th.tenant_id = tenant_uuid
    ORDER BY th.action_date DESC, th.created_at DESC
    LIMIT limit_records;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get tenant lease history from actual leases table
CREATE OR REPLACE FUNCTION get_tenant_lease_history(tenant_uuid UUID)
RETURNS TABLE (
    lease_id UUID,
    property_name TEXT,
    unit_number TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    rent_amount DECIMAL,
    deposit_amount DECIMAL,
    status TEXT,
    duration_months INTEGER,
    is_current BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id as lease_id,
        p.property_name,
        u.unit_number,
        l.start_date,
        l.end_date,
        l.rent_amount,
        l.deposit_amount,
        l.status,
        EXTRACT(EPOCH FROM (COALESCE(l.end_date, NOW()) - l.start_date)) / (30 * 24 * 3600) as duration_months,
        (l.status = 'active' AND (l.end_date IS NULL OR l.end_date >= CURRENT_DATE)) as is_current,
        l.created_at
    FROM leases l
    JOIN units u ON l.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE l.tenant_id = tenant_uuid
    ORDER BY l.start_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- PART 4: ENHANCED TRIGGERS FOR BUSINESS LOGIC ENFORCEMENT
-- ==============================================================================

-- Enhanced trigger function for tenant status validation
CREATE OR REPLACE FUNCTION enforce_tenant_status_business_logic()
RETURNS TRIGGER AS $$
BEGIN
    -- Only validate if status is being changed
    IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;
    
    -- Validate the status change
    IF NEW.status IS NOT NULL THEN
        PERFORM validate_tenant_status_change(NEW.id, NEW.status);
    END IF;
    
    -- Log status change to history
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        INSERT INTO tenant_history (
            tenant_id, action, action_date, notes, metadata
        ) VALUES (
            NEW.id, 
            'status_changed', 
            CURRENT_DATE, 
            format('Status changed from %s to %s', OLD.status, NEW.status),
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'changed_by', current_setting('request.jwt.claims', true)::json->>'sub'
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enhanced trigger function for lease management
CREATE OR REPLACE FUNCTION enhanced_lease_status_management()
RETURNS TRIGGER AS $$
DECLARE
    unit_record RECORD;
    tenant_record RECORD;
BEGIN
    -- Get related records
    SELECT * INTO unit_record FROM units WHERE id = COALESCE(NEW.unit_id, OLD.unit_id);
    SELECT * INTO tenant_record FROM tenants WHERE id = COALESCE(NEW.tenant_id, OLD.tenant_id);
    
    IF TG_OP = 'INSERT' THEN
        -- When creating a new lease, set tenant to active
        UPDATE tenants 
        SET status = 'active'::tenant_status 
        WHERE id = NEW.tenant_id;
        
        -- Update unit status
        UPDATE units 
        SET status = 'Occupied', current_tenant_id = NEW.tenant_id 
        WHERE id = NEW.unit_id;
        
        -- Log to history
        INSERT INTO tenant_history (
            tenant_id, property_id, unit_id, lease_id, action, 
            action_date, start_date, rent_amount, deposit_amount, notes
        ) VALUES (
            NEW.tenant_id, unit_record.property_id, NEW.unit_id, NEW.id, 'assigned',
            COALESCE(NEW.start_date::DATE, CURRENT_DATE), 
            NEW.start_date::DATE, 
            NEW.rent_amount, 
            NEW.deposit_amount,
            format('Tenant assigned to unit %s', unit_record.unit_number)
        );
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle lease termination
        IF OLD.status != NEW.status AND NEW.status = 'terminated' THEN
            -- Update tenant status to unassigned
            UPDATE tenants 
            SET status = 'unassigned'::tenant_status 
            WHERE id = NEW.tenant_id;
            
            -- Update unit status
            UPDATE units 
            SET status = 'Vacant', current_tenant_id = NULL 
            WHERE id = NEW.unit_id;
            
            -- Log to history
            INSERT INTO tenant_history (
                tenant_id, property_id, unit_id, lease_id, action, 
                action_date, end_date, notes, termination_reason
            ) VALUES (
                NEW.tenant_id, unit_record.property_id, NEW.unit_id, NEW.id, 'terminated',
                CURRENT_DATE, NEW.end_date::DATE, 
                format('Lease terminated for unit %s', unit_record.unit_number),
                COALESCE(NEW.notes, 'Lease terminated')
            );
        END IF;
        
        -- Handle lease renewal
        IF OLD.end_date IS NOT NULL AND NEW.end_date IS NOT NULL AND NEW.end_date > OLD.end_date THEN
            INSERT INTO tenant_history (
                tenant_id, property_id, unit_id, lease_id, action, 
                action_date, start_date, end_date, rent_amount, notes
            ) VALUES (
                NEW.tenant_id, unit_record.property_id, NEW.unit_id, NEW.id, 'renewed',
                CURRENT_DATE, NEW.start_date::DATE, NEW.end_date::DATE, NEW.rent_amount,
                format('Lease renewed for unit %s', unit_record.unit_number)
            );
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- PART 5: CREATE/UPDATE TRIGGERS
-- ==============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS enforce_tenant_status_business_logic ON tenants;
DROP TRIGGER IF EXISTS trigger_update_tenant_status_from_lease ON leases;

-- Create new triggers
CREATE TRIGGER enforce_tenant_status_business_logic
    BEFORE INSERT OR UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION enforce_tenant_status_business_logic();

CREATE TRIGGER enhanced_lease_status_management
    AFTER INSERT OR UPDATE ON leases
    FOR EACH ROW EXECUTE FUNCTION enhanced_lease_status_management();

-- ==============================================================================
-- PART 6: ADD VALIDATION CONSTRAINTS
-- ==============================================================================

-- Add constraint to prevent multiple active leases for the same tenant
CREATE OR REPLACE FUNCTION check_single_active_lease_per_tenant()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' AND (NEW.end_date IS NULL OR NEW.end_date >= CURRENT_DATE) THEN
        IF EXISTS (
            SELECT 1 FROM leases 
            WHERE tenant_id = NEW.tenant_id 
            AND id != NEW.id 
            AND status = 'active' 
            AND (end_date IS NULL OR end_date >= CURRENT_DATE)
        ) THEN
            RAISE EXCEPTION 'Tenant can only have one active lease at a time';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_single_active_lease_per_tenant
    BEFORE INSERT OR UPDATE ON leases
    FOR EACH ROW EXECUTE FUNCTION check_single_active_lease_per_tenant();

-- ==============================================================================
-- PART 7: CREATE INDEXES FOR PERFORMANCE
-- ==============================================================================

-- Indexes for business logic queries
CREATE INDEX IF NOT EXISTS idx_leases_tenant_status_active 
    ON leases(tenant_id, status) WHERE status = 'active';
    
CREATE INDEX IF NOT EXISTS idx_leases_tenant_end_date 
    ON leases(tenant_id, end_date) WHERE end_date IS NOT NULL;
    
CREATE INDEX IF NOT EXISTS idx_tenant_history_tenant_action_date 
    ON tenant_history(tenant_id, action_date DESC);
    
CREATE INDEX IF NOT EXISTS idx_tenants_status 
    ON tenants(status);

-- ==============================================================================
-- PART 8: COMMENTS AND DOCUMENTATION
-- ==============================================================================

COMMENT ON FUNCTION has_active_lease(UUID) IS 'Check if tenant has any active lease';
COMMENT ON FUNCTION has_recent_active_lease(UUID, INTEGER) IS 'Check if tenant had active lease in last N months';
COMMENT ON FUNCTION get_current_unit_assignment(UUID) IS 'Get current unit assignment for tenant';
COMMENT ON FUNCTION validate_tenant_status_change(UUID, tenant_status) IS 'Validate tenant status change against business rules';
COMMENT ON FUNCTION get_tenant_history(UUID, INTEGER) IS 'Get comprehensive tenant history';
COMMENT ON FUNCTION get_tenant_lease_history(UUID) IS 'Get tenant lease history from leases table';

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: Tenant status business logic enforcement enabled';
    RAISE NOTICE 'Business rules enforced:';
    RAISE NOTICE '1. Unassigned tenants cannot have active leases';
    RAISE NOTICE '2. Active tenants must have active lease assignments';
    RAISE NOTICE '3. Inactive tenants cannot have had active leases in last 3 months';
    RAISE NOTICE '4. Enhanced tenant history tracking enabled';
END $$; 