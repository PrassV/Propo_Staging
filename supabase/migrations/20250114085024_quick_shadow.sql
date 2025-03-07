-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name)
VALUES ('propertyimage', 'Property Images')
ON CONFLICT DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage property images" ON storage.objects;

-- Create new policy for propertyimage bucket
CREATE POLICY "Users can manage property images"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'propertyimage')
  WITH CHECK (bucket_id = 'propertyimage');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_storage_objects_propertyimage 
ON storage.objects(bucket_id) 
WHERE bucket_id = 'propertyimage';