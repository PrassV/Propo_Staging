-- Add created_by_profile relationship to maintenance_requests
ALTER TABLE maintenance_requests
ADD COLUMN created_by_profile uuid REFERENCES user_profiles(id);

-- Update existing records to set created_by_profile from created_by
UPDATE maintenance_requests mr
SET created_by_profile = created_by;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_created_by_profile 
ON maintenance_requests(created_by_profile);

-- Update policies to include new column
DROP POLICY IF EXISTS "Property owners can manage maintenance requests" ON maintenance_requests;

CREATE POLICY "Property owners can manage maintenance requests"
  ON maintenance_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = maintenance_requests.property_id
      AND (p.owner_id = auth.uid() OR maintenance_requests.created_by = auth.uid())
    )
  );