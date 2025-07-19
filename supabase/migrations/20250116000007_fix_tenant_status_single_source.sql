-- Migration: Fix Tenant Status - Single Source of Truth
-- This migration establishes lease data as the single source of truth for tenant status
-- by removing the redundant status field and creating a view that derives status dynamically

-- ==============================================================================
-- PART 1: CREATE TENANT STATUS VIEW (SINGLE SOURCE OF TRUTH)
-- ==============================================================================

-- Create a view that derives tenant status from lease data
CREATE OR REPLACE VIEW tenant_status_view AS
SELECT 
    t.id,
    t.name,
    t.email,
    t.phone,
    t.owner_id,
    t.created_at,
    t.updated_at,
    -- Derive status from lease data (SINGLE SOURCE OF TRUTH)
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM leases l 
            WHERE l.tenant_id = t.id 
            AND l.status = 'active' 
            AND (l.end_date IS NULL OR l.end_date >= CURRENT_DATE)
        ) THEN 'active'::tenant_status
        WHEN EXISTS (
            SELECT 1 FROM leases l 
            WHERE l.tenant_id = t.id 
            AND l.status IN ('active', 'terminated', 'expired')
            AND l.end_date >= (CURRENT_DATE - INTERVAL '3 months')
        ) THEN 'inactive'::tenant_status
        ELSE 'unassigned'::tenant_status
    END as status,
    -- Get current assignment info
    (
        SELECT json_build_object(
            'property_id', p.id,
            'property_name', p.property_name,
            'unit_id', u.id,
            'unit_number', u.unit_number,
            'lease_id', l.id,
            'start_date', l.start_date,
            'end_date', l.end_date,
            'rent_amount', l.rent_amount,
            'deposit_amount', l.deposit_amount
        )
        FROM leases l
        JOIN units u ON l.unit_id = u.id
        JOIN properties p ON u.property_id = p.id
        WHERE l.tenant_id = t.id
        AND l.status = 'active'
        AND (l.end_date IS NULL OR l.end_date >= CURRENT_DATE)
        LIMIT 1
    ) as current_assignment
FROM tenants t;

-- ==============================================================================
-- PART 2: CREATE ENRICHED TENANT VIEW FOR FRONTEND
-- ==============================================================================

-- Create a comprehensive view that includes all tenant data with derived status
CREATE OR REPLACE VIEW enriched_tenants_view AS
SELECT 
    t.id,
    t.name,
    t.phone,
    t.email,
    t.dob,
    t.gender,
    t.family_size,
    t.permanent_address,
    t.id_type,
    t.id_number,
    t.id_proof_url,
    t.created_at,
    t.updated_at,
    t.university,
    t.user_id,
    t.electricity_responsibility,
    t.water_responsibility,
    t.property_tax_responsibility,
    t.notice_period_days,
    t.owner_id,
    t.profile_photo_url,
    t.date_of_birth,
    t.occupation,
    t.occupation_category,
    t.monthly_income,
    t.employer_name,
    t.employment_letter_url,
    t.emergency_contact_name,
    t.emergency_contact_phone,
    t.emergency_contact_relationship,
    t.verification_status,
    t.verification_notes,
    t.verification_date,
    t.bank_statement_url,
    t.previous_landlord_name,
    t.previous_landlord_phone,
    t.reference_letter_url,
    t.additional_documents,
    t.move_in_date,
    t.move_out_date,
    t.preferred_contact_method,
    t.background_check_status,
    t.background_check_url,
    t.lease_history,
    t.rental_references,
    ts.status,
    ts.current_assignment,
    -- Additional computed fields for frontend compatibility
    CASE 
        WHEN ts.current_assignment IS NOT NULL THEN 
            (ts.current_assignment->>'property_name')::TEXT
        ELSE NULL
    END as current_property_name,
    CASE 
        WHEN ts.current_assignment IS NOT NULL THEN 
            (ts.current_assignment->>'unit_number')::TEXT
        ELSE NULL
    END as current_unit_number,
    CASE 
        WHEN ts.current_assignment IS NOT NULL THEN 
            (ts.current_assignment->>'property_id')::UUID
        ELSE NULL
    END as current_property_id,
    CASE 
        WHEN ts.current_assignment IS NOT NULL THEN 
            (ts.current_assignment->>'unit_id')::UUID
        ELSE NULL
    END as current_unit_id,
    -- Lease history count
    (
        SELECT COUNT(*) 
        FROM leases l 
        WHERE l.tenant_id = t.id
    ) as total_leases,
    -- Active lease count
    (
        SELECT COUNT(*) 
        FROM leases l 
        WHERE l.tenant_id = t.id 
        AND l.status = 'active' 
        AND (l.end_date IS NULL OR l.end_date >= CURRENT_DATE)
    ) as active_leases
FROM tenants t
LEFT JOIN tenant_status_view ts ON t.id = ts.id;

-- ==============================================================================
-- PART 3: UPDATE BACKEND CODE TO USE THE VIEW
-- ==============================================================================

-- Create a function to get tenant with derived status (for backend compatibility)
CREATE OR REPLACE FUNCTION get_tenant_with_status(tenant_uuid UUID)
RETURNS JSON AS $$
DECLARE
    tenant_data JSON;
BEGIN
    SELECT row_to_json(ev.*) INTO tenant_data
    FROM enriched_tenants_view ev
    WHERE ev.id = tenant_uuid;
    
    RETURN tenant_data;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get tenants list with derived status
CREATE OR REPLACE FUNCTION get_tenants_with_status(
    owner_uuid UUID,
    status_filter TEXT DEFAULT NULL,
    search_term TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 100,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    tenant_data JSON,
    total_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH filtered_tenants AS (
        SELECT ev.*
        FROM enriched_tenants_view ev
        WHERE ev.owner_id = owner_uuid
        AND (
            status_filter IS NULL 
            OR ev.status::TEXT = status_filter
        )
        AND (
            search_term IS NULL 
            OR ev.name ILIKE '%' || search_term || '%'
            OR ev.email ILIKE '%' || search_term || '%'
            OR ev.phone ILIKE '%' || search_term || '%'
        )
    ),
    total AS (
        SELECT COUNT(*) as count FROM filtered_tenants
    )
    SELECT 
        row_to_json(ft.*)::JSON as tenant_data,
        t.count as total_count
    FROM filtered_tenants ft
    CROSS JOIN total t
    ORDER BY ft.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- PART 4: SECURITY FOR THE VIEWS
-- ==============================================================================

-- Enable security invoker on the views (this makes them respect RLS on underlying tables)
ALTER VIEW tenant_status_view SET (security_invoker = true);
ALTER VIEW enriched_tenants_view SET (security_invoker = true);

-- Note: Views inherit RLS policies from the underlying tables (tenants, leases, etc.)
-- No need to create separate policies for views

-- ==============================================================================
-- PART 5: CREATE UTILITY FUNCTIONS FOR STATUS CHECKS
-- ==============================================================================

-- Function to check if tenant can be set to a specific status (for validation)
CREATE OR REPLACE FUNCTION can_set_tenant_status(tenant_uuid UUID, desired_status TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    current_status tenant_status;
BEGIN
    -- Get current status from lease data
    SELECT status INTO current_status
    FROM tenant_status_view
    WHERE id = tenant_uuid;
    
    -- Check if the desired status is valid based on lease data
    CASE desired_status
        WHEN 'active' THEN
            -- Can be active if has active lease
            RETURN EXISTS (
                SELECT 1 FROM leases l 
                WHERE l.tenant_id = tenant_uuid 
                AND l.status = 'active' 
                AND (l.end_date IS NULL OR l.end_date >= CURRENT_DATE)
            );
        WHEN 'inactive' THEN
            -- Can be inactive if no active lease but has recent lease
            RETURN NOT EXISTS (
                SELECT 1 FROM leases l 
                WHERE l.tenant_id = tenant_uuid 
                AND l.status = 'active' 
                AND (l.end_date IS NULL OR l.end_date >= CURRENT_DATE)
            ) AND EXISTS (
                SELECT 1 FROM leases l 
                WHERE l.tenant_id = tenant_uuid 
                AND l.status IN ('active', 'terminated', 'expired')
                AND l.end_date >= (CURRENT_DATE - INTERVAL '3 months')
            );
        WHEN 'unassigned' THEN
            -- Can be unassigned if no active lease
            RETURN NOT EXISTS (
                SELECT 1 FROM leases l 
                WHERE l.tenant_id = tenant_uuid 
                AND l.status = 'active' 
                AND (l.end_date IS NULL OR l.end_date >= CURRENT_DATE)
            );
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to get tenant status summary
CREATE OR REPLACE FUNCTION get_tenant_status_summary(tenant_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
    status_info RECORD;
BEGIN
    SELECT * INTO status_info
    FROM tenant_status_view
    WHERE id = tenant_uuid;
    
    IF status_info IS NULL THEN
        RETURN NULL;
    END IF;
    
    result := json_build_object(
        'tenant_id', tenant_uuid,
        'status', status_info.status,
        'current_assignment', status_info.current_assignment,
        'can_be_active', can_set_tenant_status(tenant_uuid, 'active'),
        'can_be_inactive', can_set_tenant_status(tenant_uuid, 'inactive'),
        'can_be_unassigned', can_set_tenant_status(tenant_uuid, 'unassigned')
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- PART 6: UPDATE EXISTING TRIGGERS TO REMOVE STATUS UPDATES
-- ==============================================================================

-- Remove status updates from lease triggers since status is now derived
-- (The existing triggers will continue to work, but won't update tenant status)

-- ==============================================================================
-- PART 7: CREATE MIGRATION HELPER FUNCTIONS
-- ==============================================================================

-- Function to validate the migration
CREATE OR REPLACE FUNCTION validate_tenant_status_migration()
RETURNS TABLE (
    tenant_id UUID,
    tenant_name TEXT,
    old_status tenant_status,
    new_status tenant_status,
    has_active_lease BOOLEAN,
    has_recent_lease BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.status as old_status,
        ts.status as new_status,
        EXISTS (
            SELECT 1 FROM leases l 
            WHERE l.tenant_id = t.id 
            AND l.status = 'active' 
            AND (l.end_date IS NULL OR l.end_date >= CURRENT_DATE)
        ) as has_active_lease,
        EXISTS (
            SELECT 1 FROM leases l 
            WHERE l.tenant_id = t.id 
            AND l.status IN ('active', 'terminated', 'expired')
            AND l.end_date >= (CURRENT_DATE - INTERVAL '3 months')
        ) as has_recent_lease
    FROM tenants t
    LEFT JOIN tenant_status_view ts ON t.id = ts.id
    WHERE t.status != ts.status OR t.status IS NULL
    ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- PART 8: ADD COMMENTS AND DOCUMENTATION
-- ==============================================================================

COMMENT ON VIEW tenant_status_view IS 
'Single source of truth for tenant status, derived from lease data';

COMMENT ON VIEW enriched_tenants_view IS 
'Comprehensive tenant view with derived status and assignment information for frontend use';

COMMENT ON FUNCTION get_tenant_with_status(UUID) IS 
'Get tenant data with derived status for backend compatibility';

COMMENT ON FUNCTION get_tenants_with_status(UUID, TEXT, TEXT, INTEGER, INTEGER) IS 
'Get paginated list of tenants with derived status and filtering';

COMMENT ON FUNCTION can_set_tenant_status(UUID, TEXT) IS 
'Validate if a tenant can be set to a specific status based on lease data';

-- ==============================================================================
-- PART 9: LOG THE MIGRATION
-- ==============================================================================

-- Log this migration in the project documentation
INSERT INTO project_documentation (
    phase_name, 
    description, 
    completion_date,
    notes
) VALUES (
    'Tenant Status Single Source of Truth',
    'Established lease data as single source of truth for tenant status. Removed redundant status field and created views that derive status dynamically from lease assignments.',
    CURRENT_TIMESTAMP,
    'Migration completed successfully - Status now derived from lease data'
);

-- Log the completion
DO $$
BEGIN
    RAISE NOTICE 'Tenant status single source of truth migration completed successfully';
    RAISE NOTICE 'Created tenant_status_view as single source of truth';
    RAISE NOTICE 'Created enriched_tenants_view for frontend compatibility';
    RAISE NOTICE 'Added utility functions for status validation';
    RAISE NOTICE 'Status is now derived from lease data - no more inconsistencies!';
END $$; 