-- Create tax_payments table
CREATE TABLE tax_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('property', 'water')),
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  payment_date DATE,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE tax_payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Property owners can manage tax payments"
  ON tax_payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = tax_payments.property_id
      AND p.owner_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_tax_payments_property ON tax_payments(property_id);
CREATE INDEX idx_tax_payments_status ON tax_payments(status);
CREATE INDEX idx_tax_payments_due_date ON tax_payments(due_date);