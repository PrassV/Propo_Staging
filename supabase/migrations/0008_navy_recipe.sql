/*
  # Add Property Management Features
  
  1. New Tables
    - Properties with type and units
    - Property documents
    - Storage buckets for documents
  
  2. Changes
    - Add property_type and number_of_units to properties table
    - Add document management capabilities
    
  3. Security
    - Storage policies for documents
    - RLS policies for new tables
*/

-- Create storage buckets
INSERT INTO storage.buckets (id, name)
VALUES 
  ('property-documents', 'Property Documents')
ON CONFLICT DO NOTHING;

-- Modify properties table
ALTER TABLE IF EXISTS properties
ADD COLUMN IF NOT EXISTS property_type TEXT CHECK (property_type IN ('vacant_land', 'commercial', 'residential', 'hostel_pg', 'other')),
ADD COLUMN IF NOT EXISTS number_of_units INTEGER CHECK (number_of_units > 0);

-- Create property_documents table
CREATE TABLE IF NOT EXISTS property_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) NOT NULL,
  document_type TEXT NOT NULL,
  document_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on new table
ALTER TABLE property_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for property_documents
CREATE POLICY "Users can manage their property documents"
  ON property_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_documents.property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- Create storage policies for property documents
CREATE POLICY "Users can manage property documents"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'property-documents')
  WITH CHECK (bucket_id = 'property-documents');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_property_documents_property_id ON property_documents(property_id);