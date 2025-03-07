-- Add property details columns
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS listed_in TEXT,
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS yearly_tax_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS size_sqft INTEGER,
ADD COLUMN IF NOT EXISTS bedrooms INTEGER,
ADD COLUMN IF NOT EXISTS bathrooms INTEGER,
ADD COLUMN IF NOT EXISTS kitchens INTEGER,
ADD COLUMN IF NOT EXISTS garages INTEGER,
ADD COLUMN IF NOT EXISTS garage_size INTEGER,
ADD COLUMN IF NOT EXISTS year_built INTEGER,
ADD COLUMN IF NOT EXISTS floors INTEGER;

-- Create indexes for commonly queried columns
CREATE INDEX IF NOT EXISTS idx_properties_category ON properties(category);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_size ON properties(size_sqft);