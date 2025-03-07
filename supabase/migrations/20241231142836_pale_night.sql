-- Create storage bucket for maintenance files if not exists
INSERT INTO storage.buckets (id, name)
VALUES ('maintenance-files', 'Maintenance Files')
ON CONFLICT DO NOTHING;

-- Create storage policy if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can manage maintenance files'
  ) THEN
    CREATE POLICY "Users can manage maintenance files"
      ON storage.objects FOR ALL
      TO authenticated
      USING (bucket_id = 'maintenance-files')
      WITH CHECK (bucket_id = 'maintenance-files');
  END IF;
END $$;

-- Update maintenance_messages policies
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view messages for their requests" ON maintenance_messages;
  DROP POLICY IF EXISTS "Users can create messages for their requests" ON maintenance_messages;

  -- Create new policies
  CREATE POLICY "Users can view messages for their requests"
    ON maintenance_messages FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM maintenance_requests r
        LEFT JOIN properties p ON r.property_id = p.id
        WHERE r.id = maintenance_messages.request_id
        AND (r.created_by = auth.uid() OR p.owner_id = auth.uid())
      )
    );

  CREATE POLICY "Users can create messages for their requests"
    ON maintenance_messages FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM maintenance_requests r
        LEFT JOIN properties p ON r.property_id = p.id
        WHERE r.id = maintenance_messages.request_id
        AND (r.created_by = auth.uid() OR p.owner_id = auth.uid())
      )
    );
END $$;

-- Create indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'maintenance_messages' 
    AND indexname = 'idx_maintenance_messages_request'
  ) THEN
    CREATE INDEX idx_maintenance_messages_request ON maintenance_messages(request_id);
  END IF;
END $$;