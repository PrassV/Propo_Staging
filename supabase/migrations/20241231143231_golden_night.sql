-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view messages for their requests" ON maintenance_messages;
DROP POLICY IF EXISTS "Users can create messages for their requests" ON maintenance_messages;

-- Update maintenance_messages policies
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

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'maintenance_messages' 
    AND indexname = 'idx_maintenance_messages_sender'
  ) THEN
    CREATE INDEX idx_maintenance_messages_sender ON maintenance_messages(sender_id);
  END IF;
END $$;