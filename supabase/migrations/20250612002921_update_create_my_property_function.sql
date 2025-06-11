DROP FUNCTION IF EXISTS create_my_property(jsonb);

CREATE OR REPLACE FUNCTION create_my_property(propert_data_arg jsonb)
RETURNS uuid AS $$
DECLARE
    new_property_id uuid;
BEGIN
    INSERT INTO properties (
        property_name,
        address_line1,
        address_line2,
        city,
        state,
        pincode,
        country,
        property_type,
        number_of_units,
        size_sqft,
        bedrooms,
        bathrooms,
        kitchens,
        garages,
        garage_size,
        year_built,
        floors,
        amenities,
        image_urls,
        yearly_tax_rate,
        survey_number,
        door_number,
        owner_id
    )
    VALUES (
        propert_data_arg->>'propertyName',
        propert_data_arg->>'addressLine1',
        propert_data_arg->>'addressLine2',
        propert_data_arg->>'city',
        propert_data_arg->>'state',
        propert_data_arg->>'pincode',
        propert_data_arg->>'country',
        (propert_data_arg->>'propertyType')::property_type,
        (propert_data_arg->>'numberOfUnits')::integer,
        (propert_data_arg->>'sizeSqft')::integer,
        (propert_data_arg->>'bedrooms')::integer,
        (propert_data_arg->>'bathrooms')::real,
        (propert_data_arg->>'kitchens')::integer,
        (propert_data_arg->>'garages')::integer,
        (propert_data_arg->>'garageSize')::integer,
        (propert_data_arg->>'yearBuilt')::integer,
        (propert_data_arg->>'floors')::integer,
        (SELECT array_agg(value) FROM jsonb_array_elements_text(propert_data_arg->'amenities')),
        (SELECT array_agg(value) FROM jsonb_array_elements_text(propert_data_arg->'imageUrls')),
        (propert_data_arg->>'yearlyTaxRate')::real,
        propert_data_arg->>'surveyNumber',
        propert_data_arg->>'doorNumber',
        auth.uid()
    ) RETURNING id INTO new_property_id;

    RETURN new_property_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to convert jsonb array of text to text array
-- This is not needed as of Postgres 12, but good practice if older versions are ever used.
-- The above ARRAY(SELECT...) syntax is generally preferred.
/*
CREATE OR REPLACE FUNCTION jsonb_array_to_text_array(jsonb)
RETURNS text[] AS $$
    SELECT array_agg(x) FROM jsonb_array_elements_text($1) t(x);
$$ LANGUAGE sql IMMUTABLE;
*/ 