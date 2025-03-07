-- Drop existing storage policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can manage property images" ON storage.objects;
END $$;

-- Create storage bucket with correct name if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'Property Images', true)
ON CONFLICT (id) DO NOTHING;

-- Create proper storage policy
CREATE POLICY "Users can manage property images"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'property-images')
  WITH CHECK (bucket_id = 'property-images');