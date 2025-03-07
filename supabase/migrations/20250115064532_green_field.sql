-- Drop views first to avoid dependency issues
DROP VIEW IF EXISTS property_payment_details CASCADE;
DROP VIEW IF EXISTS payment_details CASCADE;

-- Drop the property_payments table
DROP TABLE IF EXISTS property_payments CASCADE;

-- Verify the table is dropped
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'property_payments'
  ) THEN
    RAISE EXCEPTION 'property_payments table still exists';
  END IF;
END $$;