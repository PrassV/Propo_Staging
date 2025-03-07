/*
  # Add maintenance fee and payment tracking

  1. Schema Changes
    - Add maintenance_fee column to tenants table
    - Add payment_history table for tracking rent/maintenance payments

  2. Security
    - Enable RLS on payment_history table
    - Add policies for property owners to manage payments
*/

-- Add maintenance fee column
ALTER TABLE tenants
ADD COLUMN maintenance_fee DECIMAL(10,2);

-- Create payment history table
CREATE TABLE payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  rent_amount DECIMAL(10,2) NOT NULL,
  maintenance_amount DECIMAL(10,2) NOT NULL,
  payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'paid')),
  payment_date DATE,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Property owners can manage payment history"
  ON payment_history FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM property_tenants pt
      JOIN properties p ON pt.property_id = p.id
      WHERE pt.tenant_id = payment_history.tenant_id
      AND p.owner_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_payment_history_tenant ON payment_history(tenant_id);
CREATE INDEX idx_payment_history_period ON payment_history(period_start, period_end);
CREATE INDEX idx_payment_history_status ON payment_history(payment_status);