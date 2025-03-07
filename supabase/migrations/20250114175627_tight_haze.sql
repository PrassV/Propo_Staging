-- Add amenities column to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_properties_amenities ON properties USING gin(amenities);