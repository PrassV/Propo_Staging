-- Create payment tracking tables
CREATE TABLE IF NOT EXISTS property_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  unit_number TEXT,
  tenant_id uuid REFERENCES tenants(id),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('tax', 'rent', 'electricity')),
  period TEXT NOT NULL, -- e.g., "2024 I", "2024 II" for tax payments
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
      SELECT 1 FROM properties p
      WHERE p.id = property_payments.property_id
      AND p.owner_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_property_payments_property ON property_payments(property_id);
CREATE INDEX idx_property_payments_tenant ON property_payments(tenant_id);
CREATE INDEX idx_property_payments_type ON property_payments(payment_type);
CREATE INDEX idx_property_payments_period ON property_payments(period);
CREATE INDEX idx_property_payments_status ON property_payments(status);