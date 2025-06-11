-- Phase 4: Create DB Function to get owner for a unit
-- This helper function is used for authorization checks, efficiently finding
-- the owner of a property to which a unit belongs.

CREATE OR REPLACE FUNCTION get_owner_for_unit(p_unit_id UUID)
RETURNS UUID AS $$
DECLARE
    v_owner_id UUID;
BEGIN
    SELECT p.owner_id
    INTO v_owner_id
    FROM public.units u
    JOIN public.properties p ON u.property_id = p.id
    WHERE u.id = p_unit_id;

    RETURN v_owner_id;
END;
$$ LANGUAGE plpgsql; 