/*
  # Real Estate Application Schema Update

  1. Storage
    - Create storage buckets for documents and images
    - Set up storage access policies

  2. Tables
    - Properties table for property listings
    - Tenants table for tenant information
    - Property_tenants table for property-tenant relationships

  3. Security
    - Enable RLS on all tables
    - Create access policies
*/

-- Create storage buckets if they don't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name)
  VALUES 
    ('id-documents', 'ID Documents'),
    ('tenant-documents', 'Tenant Documents'),
    ('property-images', 'Property Images')
  ON CONFLICT DO NOTHING;
END $$;

-- Set up storage policies
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Public ID documents access" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload their documents" ON storage.objects;

  -- Create new policies
  CREATE POLICY "Public ID documents access"
    ON storage.objects FOR SELECT
    USING (bucket_id IN ('id-documents', 'tenant-documents', 'property-images'));

  CREATE POLICY "Users can upload their documents"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id IN ('id-documents', 'tenant-documents', 'property-images'));
END $$;

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES user_profiles(id) NOT NULL,
  property_name TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  survey_number TEXT NOT NULL,
  door_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  dob DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  family_size INTEGER NOT NULL,
  permanent_address TEXT NOT NULL,
  id_type TEXT NOT NULL CHECK (id_type IN ('pan_card', 'aadhaar', 'passport', 'ration_card')),
  id_number TEXT NOT NULL,
  id_proof_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create property_tenants table
CREATE TABLE IF NOT EXISTS property_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) NOT NULL,
  tenant_id uuid REFERENCES tenants(id) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(property_id, tenant_id)
);

-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_tenants ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ 
BEGIN
  -- Properties policies
  DROP POLICY IF EXISTS "Owners can view own properties" ON properties;
  DROP POLICY IF EXISTS "Owners can insert own properties" ON properties;

  CREATE POLICY "Owners can view own properties"
    ON properties FOR SELECT
    TO authenticated
    USING (owner_id = auth.uid());

  CREATE POLICY "Owners can insert own properties"
    ON properties FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = auth.uid());

  -- Tenants policies
  DROP POLICY IF EXISTS "Property owners can manage tenants" ON tenants;

  CREATE POLICY "Property owners can manage tenants"
    ON tenants FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM property_tenants pt
        JOIN properties p ON pt.property_id = p.id
        WHERE pt.tenant_id = tenants.id
        AND p.owner_id = auth.uid()
      )
    );

  -- Property_tenants policies
  DROP POLICY IF EXISTS "Property owners can manage property_tenants" ON property_tenants;

  CREATE POLICY "Property owners can manage property_tenants"
    ON property_tenants FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM properties p
        WHERE p.id = property_tenants.property_id
        AND p.owner_id = auth.uid()
      )
    );
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_property_tenants_property_id ON property_tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_property_tenants_tenant_id ON property_tenants(tenant_id);