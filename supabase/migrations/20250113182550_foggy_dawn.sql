-- Add image columns to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS image_paths TEXT[] DEFAULT '{}';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_image_urls ON properties USING gin(image_urls);
CREATE INDEX IF NOT EXISTS idx_properties_image_paths ON properties USING gin(image_paths);

-- Create storage policy for property images
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can manage property images'
  ) THEN
    CREATE POLICY "Users can manage property images"
      ON storage.objects FOR ALL
      TO authenticated
      USING (bucket_id = 'propertyimage')
      WITH CHECK (bucket_id = 'propertyimage');
  END IF;
END $$;
