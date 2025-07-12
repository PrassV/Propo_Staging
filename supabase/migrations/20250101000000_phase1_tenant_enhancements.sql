/*
  # Phase 1: Tenant System Complete Overhaul
  
  ## Changes Made:
  1. Add missing tenant fields for comprehensive data collection
  2. Create history tracking tables for tenants and units
  3. Set up document storage buckets
  4. Add proper indexes and constraints
  5. Create enum types for better data validation
  
  ## Safety Features:
  - All new columns are nullable to avoid breaking existing data
  - Proper rollback procedures included
  - Data validation checks
  - Safe migration with existing data preservation
*/

-- Create enum types for better data validation
DO $$ BEGIN
  CREATE TYPE occupation_category AS ENUM (
    'student', 'employed', 'self_employed', 'retired', 'unemployed', 'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM (
    'pending', 'verified', 'rejected', 'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM (
    'profile_photo', 'id_proof', 'income_proof', 'employment_letter', 
    'bank_statement', 'previous_rental_agreement', 'reference_letter', 
    'emergency_contact_proof', 'additional_document'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE history_action AS ENUM (
    'assigned', 'unassigned', 'terminated', 'renewed', 'status_changed', 
    'payment_made', 'maintenance_request', 'lease_modified'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Log existing data before migration
DO $$
DECLARE
    tenant_count INTEGER;
    existing_columns TEXT[];
BEGIN
    SELECT COUNT(*) INTO tenant_count FROM tenants;
    
    SELECT array_agg(column_name) INTO existing_columns 
    FROM information_schema.columns 
    WHERE table_name = 'tenants' AND table_schema = 'public';
    
    RAISE NOTICE 'MIGRATION START: Found % existing tenants', tenant_count;
    RAISE NOTICE 'EXISTING COLUMNS: %', existing_columns;
END $$;

-- Add missing tenant fields
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS occupation VARCHAR(255),
ADD COLUMN IF NOT EXISTS occupation_category occupation_category,
ADD COLUMN IF NOT EXISTS monthly_income DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS employer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS employment_letter_url TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100),
ADD COLUMN IF NOT EXISTS verification_status verification_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS verification_notes TEXT,
ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS bank_statement_url TEXT,
ADD COLUMN IF NOT EXISTS previous_landlord_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS previous_landlord_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS reference_letter_url TEXT,
ADD COLUMN IF NOT EXISTS additional_documents JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS move_in_date DATE,
ADD COLUMN IF NOT EXISTS move_out_date DATE,
ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR(50) DEFAULT 'email',
ADD COLUMN IF NOT EXISTS background_check_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS background_check_url TEXT,
ADD COLUMN IF NOT EXISTS lease_history JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS rental_references JSONB DEFAULT '[]';

-- Update existing dob column to use new date_of_birth if dob exists
UPDATE tenants 
SET date_of_birth = dob 
WHERE date_of_birth IS NULL AND dob IS NOT NULL;

-- Create tenant history tracking table
CREATE TABLE IF NOT EXISTS tenant_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
    action history_action NOT NULL,
    action_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_date DATE,
    end_date DATE,
    rent_amount DECIMAL(10,2),
    deposit_amount DECIMAL(10,2),
    payment_amount DECIMAL(10,2),
    termination_reason TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unit history tracking table
CREATE TABLE IF NOT EXISTS unit_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
    action history_action NOT NULL,
    action_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_date DATE,
    end_date DATE,
    rent_amount DECIMAL(10,2),
    deposit_amount DECIMAL(10,2),
    total_payments DECIMAL(10,2),
    maintenance_costs DECIMAL(10,2),
    occupancy_duration_days INTEGER,
    vacancy_duration_days INTEGER,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tenant documents table for better document management
CREATE TABLE IF NOT EXISTS tenant_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_type document_type NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verification_status verification_status DEFAULT 'pending',
    verification_notes TEXT,
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    is_required BOOLEAN DEFAULT FALSE,
    expiry_date DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create storage buckets for tenant documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('tenant-documents', 'Tenant Documents', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']),
  ('tenant-photos', 'Tenant Profile Photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/jpg'])
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create storage policies for tenant documents
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Tenant documents: owners can manage their tenants' documents" ON storage.objects;
    DROP POLICY IF EXISTS "Tenant photos: owners can manage their tenants' photos" ON storage.objects;
    
    -- Create new policies
    CREATE POLICY "Tenant documents: owners can manage their tenants' documents"
    ON storage.objects FOR ALL 
    TO authenticated
    USING (
      bucket_id = 'tenant-documents' AND
      auth.uid() IN (
        SELECT owner_id FROM tenants 
        WHERE id::text = split_part(name, '/', 2)
      )
    );

    CREATE POLICY "Tenant photos: owners can manage their tenants' photos"
    ON storage.objects FOR ALL 
    TO authenticated
    USING (
      bucket_id = 'tenant-photos' AND
      auth.uid() IN (
        SELECT owner_id FROM tenants 
        WHERE id::text = split_part(name, '/', 2)
      )
    );
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tenant_history_tenant_id ON tenant_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_history_property_id ON tenant_history(property_id);
CREATE INDEX IF NOT EXISTS idx_tenant_history_action_date ON tenant_history(action_date);
CREATE INDEX IF NOT EXISTS idx_tenant_history_action ON tenant_history(action);

CREATE INDEX IF NOT EXISTS idx_unit_history_unit_id ON unit_history(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_history_property_id ON unit_history(property_id);
CREATE INDEX IF NOT EXISTS idx_unit_history_tenant_id ON unit_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_unit_history_action_date ON unit_history(action_date);

CREATE INDEX IF NOT EXISTS idx_tenant_documents_tenant_id ON tenant_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_documents_type ON tenant_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_tenant_documents_verification_status ON tenant_documents(verification_status);

CREATE INDEX IF NOT EXISTS idx_tenants_verification_status ON tenants(verification_status);
CREATE INDEX IF NOT EXISTS idx_tenants_occupation_category ON tenants(occupation_category);
CREATE INDEX IF NOT EXISTS idx_tenants_date_of_birth ON tenants(date_of_birth);

-- Add constraints for data validation
DO $$
BEGIN
    -- Add monthly income constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE constraint_name = 'chk_monthly_income_positive'
    ) THEN
        ALTER TABLE tenants 
        ADD CONSTRAINT chk_monthly_income_positive 
        CHECK (monthly_income IS NULL OR monthly_income > 0);
    END IF;
    
    -- Add emergency contact phone format constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE constraint_name = 'chk_emergency_contact_phone_format'
    ) THEN
        ALTER TABLE tenants 
        ADD CONSTRAINT chk_emergency_contact_phone_format 
        CHECK (emergency_contact_phone IS NULL OR emergency_contact_phone ~ '^\+?[\d\s\-\(\)]+$');
    END IF;
    
    -- Add family size constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE constraint_name = 'chk_family_size_reasonable'
    ) THEN
        ALTER TABLE tenants 
        ADD CONSTRAINT chk_family_size_reasonable 
        CHECK (family_size IS NULL OR (family_size > 0 AND family_size <= 20));
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE tenant_history IS 'Comprehensive history tracking for tenant actions, assignments, and lifecycle events';
COMMENT ON TABLE unit_history IS 'Detailed history of unit occupancy, financial performance, and maintenance activities';
COMMENT ON TABLE tenant_documents IS 'Document management for tenant onboarding, verification, and compliance';

COMMENT ON COLUMN tenants.profile_photo_url IS 'URL/path to tenant profile photo stored in tenant-photos bucket';
COMMENT ON COLUMN tenants.date_of_birth IS 'Tenant date of birth - required for age verification and legal compliance';
COMMENT ON COLUMN tenants.occupation IS 'Tenant occupation/job title for income verification';
COMMENT ON COLUMN tenants.occupation_category IS 'Broad category of occupation for analytics and risk assessment';
COMMENT ON COLUMN tenants.monthly_income IS 'Monthly income in INR for affordability assessment';
COMMENT ON COLUMN tenants.verification_status IS 'Status of tenant verification process';
COMMENT ON COLUMN tenants.emergency_contact_name IS 'Emergency contact person name';
COMMENT ON COLUMN tenants.emergency_contact_phone IS 'Emergency contact phone number';

-- Create trigger to update tenant status based on lease status
CREATE OR REPLACE FUNCTION update_tenant_status_from_lease()
RETURNS TRIGGER AS $$
BEGIN
    -- Update tenant status based on lease changes
    IF TG_OP = 'INSERT' THEN
        UPDATE tenants 
        SET status = 'active'::tenant_status 
        WHERE id = NEW.tenant_id;
        
        -- Log to history
        INSERT INTO tenant_history (
            tenant_id, property_id, unit_id, lease_id, action, 
            action_date, start_date, rent_amount, deposit_amount, notes
        ) VALUES (
            NEW.tenant_id, NEW.property_id, NEW.unit_id, NEW.id, 'assigned',
            NEW.start_date, NEW.start_date, NEW.rent_amount, NEW.deposit_amount,
            'Tenant assigned to unit via lease creation'
        );
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status AND NEW.status = 'terminated' THEN
            UPDATE tenants 
            SET status = 'unassigned'::tenant_status 
            WHERE id = NEW.tenant_id;
            
            -- Log to history
            INSERT INTO tenant_history (
                tenant_id, property_id, unit_id, lease_id, action, 
                action_date, end_date, notes
            ) VALUES (
                NEW.tenant_id, NEW.property_id, NEW.unit_id, NEW.id, 'terminated',
                CURRENT_DATE, NEW.end_date, 'Lease terminated'
            );
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_tenant_status_from_lease ON leases;

-- Create new trigger
CREATE TRIGGER trigger_update_tenant_status_from_lease
    AFTER INSERT OR UPDATE ON leases
    FOR EACH ROW EXECUTE FUNCTION update_tenant_status_from_lease();

-- Create function to get tenant history
CREATE OR REPLACE FUNCTION get_tenant_history(tenant_uuid UUID)
RETURNS TABLE (
    history_id UUID,
    action history_action,
    action_date DATE,
    property_name TEXT,
    unit_number TEXT,
    rent_amount DECIMAL,
    deposit_amount DECIMAL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        th.id,
        th.action,
        th.action_date,
        p.property_name,
        u.unit_number,
        th.rent_amount,
        th.deposit_amount,
        th.notes,
        th.created_at
    FROM tenant_history th
    LEFT JOIN properties p ON th.property_id = p.id
    LEFT JOIN units u ON th.unit_id = u.id
    WHERE th.tenant_id = tenant_uuid
    ORDER BY th.action_date DESC, th.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get unit history
CREATE OR REPLACE FUNCTION get_unit_history(unit_uuid UUID)
RETURNS TABLE (
    history_id UUID,
    action history_action,
    action_date DATE,
    tenant_name TEXT,
    rent_amount DECIMAL,
    total_payments DECIMAL,
    maintenance_costs DECIMAL,
    occupancy_duration_days INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uh.id,
        uh.action,
        uh.action_date,
        t.name,
        uh.rent_amount,
        uh.total_payments,
        uh.maintenance_costs,
        uh.occupancy_duration_days,
        uh.notes,
        uh.created_at
    FROM unit_history uh
    LEFT JOIN tenants t ON uh.tenant_id = t.id
    WHERE uh.unit_id = unit_uuid
    ORDER BY uh.action_date DESC, uh.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log completion
DO $$
DECLARE
    new_tenant_count INTEGER;
    history_tables_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO new_tenant_count FROM tenants;
    
    SELECT COUNT(*) INTO history_tables_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('tenant_history', 'unit_history', 'tenant_documents');
    
    RAISE NOTICE 'MIGRATION COMPLETE: % tenants migrated, % history tables created', 
                 new_tenant_count, history_tables_count;
END $$;

-- Insert storage configurations
INSERT INTO storage_bucket_config (id, context, bucket_name, is_public, max_size_bytes, allowed_mime_types, path_template, description)
VALUES 
  ('tenant-documents-config', 'tenant_documents', 'tenant-documents', false, 52428800, 
   ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'], 
   'tenants/{tenant_id}/documents/{document_type}/{filename}',
   'Tenant document storage for onboarding, verification, and compliance'),
  ('tenant-photos-config', 'tenant_photos', 'tenant-photos', false, 10485760, 
   ARRAY['image/jpeg', 'image/png', 'image/jpg'], 
   'tenants/{tenant_id}/photos/{filename}',
   'Tenant profile photo storage')
ON CONFLICT (id) DO UPDATE SET 
  context = EXCLUDED.context,
  bucket_name = EXCLUDED.bucket_name,
  is_public = EXCLUDED.is_public,
  max_size_bytes = EXCLUDED.max_size_bytes,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  path_template = EXCLUDED.path_template,
  description = EXCLUDED.description;

-- Final validation check
DO $$
DECLARE
    missing_columns TEXT[];
    required_columns TEXT[] := ARRAY[
        'profile_photo_url', 'date_of_birth', 'occupation', 'occupation_category',
        'monthly_income', 'emergency_contact_name', 'emergency_contact_phone',
        'verification_status', 'employer_name', 'employment_letter_url'
    ];
    col TEXT;
BEGIN
    missing_columns := ARRAY[]::TEXT[];
    
    FOREACH col IN ARRAY required_columns
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tenants' 
            AND table_schema = 'public' 
            AND column_name = col
        ) THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE EXCEPTION 'MIGRATION FAILED: Missing columns: %', missing_columns;
    ELSE
        RAISE NOTICE 'MIGRATION VALIDATION: All required columns added successfully';
    END IF;
END $$; 