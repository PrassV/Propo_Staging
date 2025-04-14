-- Create units table
CREATE TABLE IF NOT EXISTS units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  unit_number TEXT NOT NULL,
  status TEXT DEFAULT 'Vacant',
  bedrooms INTEGER,
  bathrooms NUMERIC(3,1),
  area_sqft INTEGER,
  rent DECIMAL(10,2),
  deposit DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);

-- Create unique constraint for unit numbers within a property
ALTER TABLE units ADD CONSTRAINT unique_unit_number_per_property UNIQUE (property_id, unit_number);

-- Enable RLS
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- Create policy for property owners to manage units
CREATE POLICY "Property owners can manage units"
  ON units
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = units.property_id
      AND p.owner_id = auth.uid()
    )
  );
