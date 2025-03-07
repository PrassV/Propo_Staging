-- Create electricity_payments table
CREATE TABLE electricity_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_tenant_id uuid NOT NULL REFERENCES property_tenants(id) ON DELETE CASCADE,
  meter_number TEXT,
  reading_start DECIMAL(10,2),
  reading_end DECIMAL(10,2),
  units_consumed DECIMAL(10,2),
  rate_per_unit DECIMAL(10,2),
  amount DECIMAL(10,2) NOT NULL,
  bill_period TEXT NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE electricity_payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Property owners can manage electricity payments"
  ON electricity_payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM property_tenants pt
      JOIN properties p ON pt.property_id = p.id
      WHERE pt.id = electricity_payments.property_tenant_id
      AND p.owner_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_electricity_payments_tenant ON electricity_payments(property_tenant_id);
CREATE INDEX idx_electricity_payments_status ON electricity_payments(status);
CREATE INDEX idx_electricity_payments_due_date ON electricity_payments(due_date);

-- Create view for electricity payment details
CREATE VIEW electricity_payment_details AS
SELECT 
  ep.*,
  pt.unit_number,
  t.name AS tenant_name,
  t.email AS tenant_email,
  p.property_name,
  p.id AS property_id
FROM electricity_payments ep
JOIN property_tenants pt ON ep.property_tenant_id = pt.id
JOIN tenants t ON pt.tenant_id = t.id
JOIN properties p ON pt.property_id = p.id;