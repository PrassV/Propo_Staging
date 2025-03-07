/*
  # Tenant Management Schema

  1. New Tables
    - tenants: Stores tenant information with required fields
    - property_tenants: Links tenants to properties with dates
  2. Security
    - Enable RLS on both tables
    - Add policies for property owners
*/

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
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_tenants ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Property owners can manage tenants"
  ON tenants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM property_tenants pt
      JOIN properties p ON pt.property_id = p.id
      WHERE pt.tenant_id = tenants.id
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Property owners can manage property_tenants"
  ON property_tenants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_tenants.property_id
      AND p.owner_id = auth.uid()
    )
  );