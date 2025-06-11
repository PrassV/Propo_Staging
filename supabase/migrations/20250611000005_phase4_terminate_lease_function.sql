-- Phase 4: Create DB Function for Atomic Lease Termination
-- This migration creates a SQL function that terminates a lease and vacates the unit
-- in a single, atomic transaction.

CREATE OR REPLACE FUNCTION terminate_lease_and_vacate_unit(p_lease_id UUID)
RETURNS VOID AS $$
DECLARE
    v_unit_id UUID;
BEGIN
    -- Step 1: Find the unit associated with the lease and lock the rows.
    SELECT unit_id INTO v_unit_id FROM public.leases WHERE id = p_lease_id FOR UPDATE;

    IF v_unit_id IS NULL THEN
        RAISE EXCEPTION 'Lease % not found.', p_lease_id;
    END IF;

    -- Also lock the unit row to prevent other simultaneous updates.
    PERFORM id FROM public.units WHERE id = v_unit_id FOR UPDATE;

    -- Step 2: Update the lease status to 'terminated'.
    UPDATE public.leases
    SET status = 'terminated',
        updated_at = NOW()
    WHERE id = p_lease_id;

    -- Step 3: Update the unit to mark it as vacant and remove the tenant link.
    UPDATE public.units
    SET is_occupied = FALSE,
        tenant_id = NULL
    WHERE id = v_unit_id;

END;
$$ LANGUAGE plpgsql; 