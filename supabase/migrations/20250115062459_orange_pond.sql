-- Drop existing table and related objects if they exist
DROP TABLE IF EXISTS property_payments CASCADE;
DROP VIEW IF EXISTS property_payment_details CASCADE;
DROP VIEW IF EXISTS payment_details CASCADE;

-- Create property_payments table with correct schema
CREATE TABLE property_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_tenant_id uuid NOT NULL REFERENCES property_tenants(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('tax', 'rent', 'electricity')),
  period TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  receipt_url TEXT,
  payment_link TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE property_payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Property owners can manage payments"
  ON property_payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM property_tenants pt
      JOIN properties p ON pt.property_id = p.id
      WHERE pt.id = property_payments.property_tenant_id
      AND p.owner_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_property_payments_tenant_rel ON property_payments(property_tenant_id);
CREATE INDEX idx_property_payments_type ON property_payments(payment_type);
CREATE INDEX idx_property_payments_status ON property_payments(status);
CREATE INDEX idx_property_payments_due_date ON property_payments(due_date);

-- Create view for payment details
CREATE VIEW property_payment_details AS
SELECT 
  pp.*,
  pt.unit_number,
  t.name AS tenant_name,
  t.email AS tenant_email,
  p.property_name,
  p.id AS property_id
FROM property_payments pp
JOIN property_tenants pt ON pp.property_tenant_id = pt.id
JOIN tenants t ON pt.tenant_id = t.id
JOIN properties p ON pt.property_id = p.id;