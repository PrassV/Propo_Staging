-- Create unified storage buckets for all file types
-- This migration sets up the complete storage infrastructure

-- Enable storage if not already enabled
CREATE EXTENSION IF NOT EXISTS "storage" SCHEMA "extensions";

-- Create property images bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'propertyimage',
  'propertyimage', 
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- Create tenant documents bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-documents',
  'tenant-documents',
  false,
  26214400, -- 25MB
  ARRAY[
    'application/pdf', 
    'image/jpeg', 
    'image/png', 
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
) ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 26214400,
  allowed_mime_types = ARRAY[
    'application/pdf', 
    'image/jpeg', 
    'image/png', 
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

-- Create maintenance files bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'maintenance-files',
  'maintenance-files',
  false,
  15728640, -- 15MB
  ARRAY['image/jpeg', 'image/png', 'application/pdf', 'image/jpg']
) ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 15728640,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'application/pdf', 'image/jpg'];

-- Create agreements bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agreements',
  'agreements',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf']
) ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf'];

-- Create ID documents bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'id-documents',
  'id-documents',
  false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'application/pdf', 'image/jpg']
) ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'application/pdf', 'image/jpg'];

-- Create RLS policies for property images (public bucket)
CREATE POLICY "Public property images are viewable by everyone" ON storage.objects
FOR SELECT USING (bucket_id = 'propertyimage');

CREATE POLICY "Authenticated users can upload property images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'propertyimage' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own property images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'propertyimage' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own property images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'propertyimage' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create RLS policies for tenant documents (private bucket)
CREATE POLICY "Users can view their own tenant documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'tenant-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own tenant documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'tenant-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own tenant documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'tenant-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own tenant documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'tenant-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create RLS policies for maintenance files (private bucket)
CREATE POLICY "Property owners can view maintenance files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'maintenance-files' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can upload maintenance files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'maintenance-files' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update maintenance files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'maintenance-files' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete maintenance files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'maintenance-files' AND 
  auth.role() = 'authenticated'
);

-- Create RLS policies for agreements (private bucket)
CREATE POLICY "Property owners can view agreements" ON storage.objects
FOR SELECT USING (
  bucket_id = 'agreements' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can upload agreements" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'agreements' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update agreements" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'agreements' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete agreements" ON storage.objects
FOR DELETE USING (
  bucket_id = 'agreements' AND 
  auth.role() = 'authenticated'
);

-- Create RLS policies for ID documents (private bucket)
CREATE POLICY "Users can view their own ID documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'id-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own ID documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'id-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own ID documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'id-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own ID documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'id-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_storage_objects_bucket_folder 
ON storage.objects (bucket_id, (storage.foldername(name)));

CREATE INDEX IF NOT EXISTS idx_storage_objects_bucket_created 
ON storage.objects (bucket_id, created_at);

-- Add helpful comments
COMMENT ON TABLE storage.buckets IS 'Unified storage buckets for property management system';
COMMENT ON COLUMN storage.buckets.file_size_limit IS 'Maximum file size in bytes';
COMMENT ON COLUMN storage.buckets.allowed_mime_types IS 'Array of allowed MIME types for uploads'; 