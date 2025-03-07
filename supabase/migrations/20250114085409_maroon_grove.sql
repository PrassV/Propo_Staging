-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage property images" ON storage.objects;

-- Create more permissive policy similar to tenant documents
CREATE POLICY "Allow property image uploads"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'propertyimage');

-- Ensure bucket exists with correct permissions
INSERT INTO storage.buckets (id, name, public)
VALUES ('propertyimage', 'Property Images', true)
ON CONFLICT (id) DO UPDATE
SET public = true;