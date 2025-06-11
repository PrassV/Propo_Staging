-- Phase 1: Linking Payments & Maintenance to the Lease (Corrected, v2)
-- This migration ensures the lease_id column exists, is nullable, and is clean before adding constraints.
-- It is designed to be idempotent and recover from a previously broken schema state.

-- == PAYMENTS TABLE ==

-- Step 1: Ensure the lease_id column exists.
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS lease_id UUID;

-- Step 2: Force the column to be NULLABLE.
-- This is critical to remove any NOT NULL constraint from previous failed attempts.
ALTER TABLE public.payments ALTER COLUMN lease_id DROP NOT NULL;

-- Step 3: Set lease_id to NULL for all existing records.
-- This cleans up orphaned data and aligns with our historical data strategy.
UPDATE public.payments SET lease_id = NULL WHERE lease_id IS NOT NULL;

-- Step 4: Add the foreign key constraint for payments.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_lease_id_fkey' AND conrelid = 'public.payments'::regclass) THEN
    ALTER TABLE public.payments DROP CONSTRAINT payments_lease_id_fkey;
  END IF;
  ALTER TABLE public.payments
    ADD CONSTRAINT payments_lease_id_fkey
    FOREIGN KEY (lease_id) REFERENCES public.leases(id);
END;
$$;

-- == MAINTENANCE REQUESTS TABLE ==

-- Step 5: Ensure the lease_id column exists.
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS lease_id UUID;

-- Step 6: Force the column to be NULLABLE.
ALTER TABLE public.maintenance_requests ALTER COLUMN lease_id DROP NOT NULL;

-- Step 7: Set lease_id to NULL for all existing records.
UPDATE public.maintenance_requests SET lease_id = NULL WHERE lease_id IS NOT NULL;

-- Step 8: Add the foreign key constraint for maintenance_requests.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_requests_lease_id_fkey' AND conrelid = 'public.maintenance_requests'::regclass) THEN
    ALTER TABLE public.maintenance_requests DROP CONSTRAINT maintenance_requests_lease_id_fkey;
  END IF;
  ALTER TABLE public.maintenance_requests
    ADD CONSTRAINT maintenance_requests_lease_id_fkey
    FOREIGN KEY (lease_id) REFERENCES public.leases(id);
END;
$$; 