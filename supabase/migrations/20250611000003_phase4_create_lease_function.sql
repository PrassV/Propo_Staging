-- Phase 4: Create DB Function for Atomic Lease Creation
-- This migration creates a SQL function that creates a lease and occupies the unit
-- in a single, atomic transaction to ensure data integrity.

CREATE OR REPLACE FUNCTION create_lease_and_occupy_unit(
    p_unit_id UUID,
    p_tenant_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_rent_amount DECIMAL,
    p_deposit_amount DECIMAL,
    p_notes TEXT
)
RETURNS JSONB AS $$
DECLARE
    unit_status BOOLEAN;
    new_lease_id UUID;
    result JSONB;
BEGIN
    -- Step 1: Lock the unit row and check its status to prevent race conditions.
    SELECT is_occupied INTO unit_status FROM public.units WHERE id = p_unit_id FOR UPDATE;

    -- Step 2: If the unit is already occupied, raise an exception.
    IF unit_status = TRUE THEN
        RAISE EXCEPTION 'Unit % is already occupied.', p_unit_id;
    END IF;

    -- Step 3: Insert the new lease record.
    INSERT INTO public.leases (id, unit_id, tenant_id, start_date, end_date, rent_amount, deposit_amount, notes, status)
    VALUES (gen_random_uuid(), p_unit_id, p_tenant_id, p_start_date, p_end_date, p_rent_amount, p_deposit_amount, p_notes, 'active')
    RETURNING id INTO new_lease_id;

    -- Step 4: Update the unit to mark it as occupied and link the tenant.
    -- This uses the direct foreign key from the units table to the tenants table.
    UPDATE public.units
    SET is_occupied = TRUE,
        tenant_id = p_tenant_id -- Link the tenant directly to the unit
    WHERE id = p_unit_id;

    -- Step 5: Fetch the newly created lease to return it.
    SELECT to_jsonb(l) INTO result FROM public.leases l WHERE l.id = new_lease_id;

    RETURN result;
END;
$$ LANGUAGE plpgsql; 