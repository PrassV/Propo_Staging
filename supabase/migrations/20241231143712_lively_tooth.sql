-- Drop existing table if it exists
DROP TABLE IF EXISTS maintenance_messages CASCADE;

-- Create maintenance messages table
CREATE TABLE maintenance_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  attachments TEXT[],
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('owner', 'tenant')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE maintenance_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Create indexes
CREATE INDEX idx_maintenance_messages_request ON maintenance_messages(request_id);
CREATE INDEX idx_maintenance_messages_sender ON maintenance_messages(sender_id);