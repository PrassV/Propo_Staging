-- Phase 2: Create DB Function for Lease-Centric Property View
-- This migration creates a SQL function that returns a detailed, nested JSON object
-- for a property, its units, and their active leases.

CREATE OR REPLACE FUNCTION get_property_lease_details(p_property_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT
        jsonb_build_object(
            'id', p.id,
            'name', p.property_name,
            'address', p.address_line1 || ', ' || p.city || ', ' || p.state || ' ' || p.pincode,
            'units', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', u.id,
                            'unit_number', u.unit_number,
                            'is_occupied', CASE 
                                WHEN l.id IS NOT NULL THEN true 
                                ELSE COALESCE(u.status <> 'Vacant', false)
                            END,
                            'lease', CASE 
                                WHEN l.id IS NOT NULL THEN
                                    jsonb_build_object(
                                        'id', l.id,
                                        'start_date', l.start_date,
                                        'end_date', l.end_date,
                                        'rent_amount', l.rent_amount,
                                        'status', l.status,
                                        'tenant', (
                                            SELECT jsonb_build_object(
                                                'id', t.id,
                                                'name', t.name,
                                                'email', t.email
                                            )
                                            FROM tenants t
                                            WHERE t.id = l.tenant_id
                                        )
                                    )
                                ELSE NULL
                            END
                        )
                    )
                    FROM units u
                    LEFT JOIN (
                        SELECT DISTINCT ON (unit_id) 
                            id, unit_id, start_date, end_date, rent_amount, status, tenant_id
                        FROM leases 
                        WHERE status IN ('active', 'current') 
                           OR (status IS NULL AND end_date >= CURRENT_DATE)
                        ORDER BY unit_id, start_date DESC
                    ) l ON l.unit_id = u.id
                    WHERE u.property_id = p.id
                ),
                '[]'::JSONB
            )
        )
    INTO result
    FROM properties p
    WHERE p.id = p_property_id;

    RETURN result;
END;
$$ LANGUAGE plpgsql; 