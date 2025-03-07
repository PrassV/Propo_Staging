-- Update properties table with Indian-specific amenities
ALTER TABLE properties
DROP CONSTRAINT IF EXISTS check_amenities;

ALTER TABLE properties
ADD CONSTRAINT check_amenities CHECK (
  amenities <@ ARRAY[
    -- Basic Amenities
    'power_backup', 'water_storage', 'security_guard', 'cctv', 'intercom',
    -- Parking
    'covered_parking', 'visitor_parking', 'two_wheeler_parking',
    -- Utilities
    'piped_gas', 'rainwater_harvesting', 'solar_panels',
    -- Common Areas
    'lift', 'garden', 'temple', 'community_hall', 'children_play_area',
    -- House Features
    'vastu_compliant', 'pooja_room', 'servant_room', 'study_room',
    'store_room', 'balcony', 'modular_kitchen',
    -- Facilities
    'gym', 'swimming_pool', 'clubhouse'
  ]::text[]
);

COMMENT ON CONSTRAINT check_amenities ON properties IS 'Ensures only valid Indian property amenities are stored';