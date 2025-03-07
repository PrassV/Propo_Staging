-- Drop existing policies
DROP POLICY IF EXISTS "Owners can view own properties" ON properties;
DROP POLICY IF EXISTS "Owners can insert own properties" ON properties;

-- Create comprehensive policies for properties table
CREATE POLICY "Property owners can manage own properties"
  ON properties FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Create cascade delete trigger
CREATE OR REPLACE FUNCTION handle_property_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete related property_tenants records
  DELETE FROM property_tenants WHERE property_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER before_property_delete
  BEFORE DELETE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION handle_property_deletion();