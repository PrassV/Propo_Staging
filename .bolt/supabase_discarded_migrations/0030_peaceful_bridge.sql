-- Drop existing policies
DROP POLICY IF EXISTS "Allow tenant creation" ON tenants;
DROP POLICY IF EXISTS "Allow tenant viewing" ON tenants;
DROP POLICY IF EXISTS "Allow tenant updates" ON tenants;
DROP POLICY IF EXISTS "Allow tenant deletion" ON tenants;
DROP POLICY IF EXISTS "Allow property_tenants management" ON property_tenants;

-- Create new comprehensive policies for tenants
CREATE POLICY "Enable tenant self-management"
  ON tenants FOR ALL
  TO authenticated
  USING (
    -- Allow tenants to manage their own records
    user_id = auth.uid() OR
    -- Allow property owners to manage tenants linked to their properties
    EXISTS (
      SELECT 1 FROM property_tenants pt
      JOIN properties p ON pt.property_id = p.id
      WHERE pt.tenant_id = tenants.id
      AND p.owner_id = auth.uid()
    )
  );

-- Update property_tenants policies
CREATE POLICY "Enable property_tenants management"
  ON property_tenants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_tenants.property_id
      AND p.owner_id = auth.uid()
    )
  );