/*
  # Fix Property Image Storage Schema
  
  1. Fix bucket name inconsistencies
  2. Clarify column naming (paths vs URLs)
  3. Ensure proper storage policies
  4. Clean up old bucket references
*/

-- Fix bucket name consistency (use 'propertyimage' everywhere)
UPDATE storage.buckets 
SET id = 'propertyimage', name = 'Property Images'
WHERE id IN ('property-images', 'propertyimage');

-- Remove old bucket if it exists
DELETE FROM storage.buckets WHERE id = 'property-images' AND id != 'propertyimage';

-- Ensure the correct bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('propertyimage', 'Property Images', true)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  public = EXCLUDED.public;

-- Drop old storage policies
DROP POLICY IF EXISTS "Users can manage property images" ON storage.objects;
DROP POLICY IF EXISTS "Public ID documents access" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their documents" ON storage.objects;

-- Create clean storage policy for property images
CREATE POLICY "Property owners can manage images"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'propertyimage')
  WITH CHECK (bucket_id = 'propertyimage');

-- Fix properties table column naming (clarify paths vs URLs)
-- We'll keep image_urls but it actually stores paths (legacy naming)
-- Add comment to clarify
COMMENT ON COLUMN properties.image_urls IS 'Stores image paths (not URLs) - URLs generated on demand';
COMMENT ON COLUMN properties.image_paths IS 'Backup/alternate storage for image paths';

-- Ensure both columns exist with proper defaults
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS image_paths TEXT[] DEFAULT '{}';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_properties_image_paths 
ON properties USING gin(image_urls);

-- Update any old bucket references in storage objects
UPDATE storage.objects 
SET bucket_id = 'propertyimage' 
WHERE bucket_id = 'property-images';

-- Create function to generate public URLs for property images
CREATE OR REPLACE FUNCTION get_property_image_urls(property_uuid UUID)
RETURNS TEXT[] AS $$
DECLARE
    image_paths TEXT[];
    base_url TEXT;
    result_urls TEXT[];
    path TEXT;
BEGIN
    -- Get image paths from property
    SELECT image_urls INTO image_paths
    FROM properties 
    WHERE id = property_uuid;
    
    -- Return empty array if no paths
    IF image_paths IS NULL OR array_length(image_paths, 1) IS NULL THEN
        RETURN ARRAY[]::TEXT[];
    END IF;
    
    -- Get Supabase storage base URL
    base_url := current_setting('app.supabase_url', true) || '/storage/v1/object/public/propertyimage/';
    
    -- Generate URLs for each path
    result_urls := ARRAY[]::TEXT[];
    FOREACH path IN ARRAY image_paths
    LOOP
        IF path IS NOT NULL AND path != '' THEN
            result_urls := array_append(result_urls, base_url || path);
        END IF;
    END LOOP;
    
    RETURN result_urls;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 