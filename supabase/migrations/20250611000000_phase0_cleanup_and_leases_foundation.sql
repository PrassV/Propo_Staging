-- Phase 0: Database Cleanup and Foundation
-- This migration performs the initial database cleanup and setup for the new lease-centric architecture.

-- Step 1: Drop the redundant foreign key constraint on the units table.
-- We've identified two foreign keys between units and tenants. This removes the legacy one.
ALTER TABLE public.units DROP CONSTRAINT IF EXISTS units_current_tenant_id_fkey;

-- Step 2: Rename the property_tenant_link table to leases.
-- This table will become the central source of truth for all tenancy agreements.
ALTER TABLE IF EXISTS public.property_tenant_link RENAME TO leases;

-- Step 3: Bolster the leases table with standardized columns.
-- This ensures the leases table contains all necessary information about a lease agreement.
-- We use TIMESTAMPTZ for dates to include timezone information, which is more robust.
ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rent_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC;

-- Step 4: Add a unique index to enforce that a unit can only have one active lease.
-- An active lease is defined as one where the end_date is NULL.
-- This is a critical data integrity constraint.
-- We drop it first to ensure the 'CREATE' command doesn't fail on re-runs.
DROP INDEX IF EXISTS one_active_lease_per_unit;
CREATE UNIQUE INDEX one_active_lease_per_unit ON public.leases (unit_id) WHERE (end_date IS NULL); 