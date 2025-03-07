/*
  # Add maintenance fee and payment tracking

  1. Changes
    - Add maintenance_fee column to tenants table
    - Create payment_tracking table for monthly records
    - Add policies for payment management

  2. Security
    - Enable RLS on payment_tracking table
    - Add policy for property owners to manage payments
*/

-- Add maintenance fee column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'maintenance_fee'
  ) THEN
    ALTER TABLE tenants ADD COLUMN maintenance_fee DECIMAL(10,2);
  END IF;
END $$;

-- Create payment tracking table
CREATE TABLE IF NOT EXISTS payment_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  rent_amount DECIMAL(10,2) NOT NULL,
  maintenance_fee DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'paid')),
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE payment_tracking ENABLE ROW LEVEL SECURITY;

-- Create policy for payment management
CREATE POLICY "Property owners can manage payments"
  ON payment_tracking FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM property_tenants pt
      JOIN properties p ON pt.property_id = p.id
      WHERE pt.tenant_id = payment_tracking.tenant_id
      AND p.owner_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_tracking_tenant ON payment_tracking(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_tracking_date ON payment_tracking(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_tracking_status ON payment_tracking(payment_status);