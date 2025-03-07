-- Drop views first
DROP VIEW IF EXISTS property_payment_details CASCADE;
DROP VIEW IF EXISTS payment_details CASCADE;

-- Drop the redundant property_payments table
DROP TABLE IF EXISTS property_payments CASCADE;

-- Create a comprehensive view that combines all payment types
CREATE VIEW all_payment_details AS
-- Rent payments
SELECT
  ph.id,
  pt.id AS property_tenant_id,
  'rent' AS payment_type,
  ph.period_start || ' - ' || ph.period_end AS period,
  ph.rent_amount + ph.maintenance_amount AS amount,
  ph.period_start AS due_date,
  ph.payment_date,
  ph.payment_status AS status,
  ph.receipt_url,
  NULL AS payment_link,
  NULL AS notes,
  ph.created_at,
  ph.updated_at,
  pt.unit_number,
  t.name AS tenant_name,
  t.email AS tenant_email,
  p.property_name,
  p.id AS property_id
FROM payment_history ph
JOIN property_tenants pt ON ph.tenant_id = pt.tenant_id
JOIN tenants t ON pt.tenant_id = t.id
JOIN properties p ON pt.property_id = p.id

UNION ALL

-- Tax payments
SELECT
  tp.id,
  NULL AS property_tenant_id,
  'tax' AS payment_type,
  tp.type || ' tax' AS period,
  tp.amount,
  tp.due_date,
  tp.payment_date,
  tp.status,
  tp.receipt_url,
  NULL AS payment_link,
  NULL AS notes,
  tp.created_at,
  tp.updated_at,
  NULL AS unit_number,
  NULL AS tenant_name,
  NULL AS tenant_email,
  p.property_name,
  p.id AS property_id
FROM tax_payments tp
JOIN properties p ON tp.property_id = p.id

UNION ALL

-- Electricity payments
SELECT
  ep.id,
  ep.property_tenant_id,
  'electricity' AS payment_type,
  ep.bill_period AS period,
  ep.amount,
  ep.due_date,
  ep.payment_date,
  ep.status,
  ep.receipt_url,
  NULL AS payment_link,
  ep.notes,
  ep.created_at,
  ep.updated_at,
  pt.unit_number,
  t.name AS tenant_name,
  t.email AS tenant_email,
  p.property_name,
  p.id AS property_id
FROM electricity_payments ep
JOIN property_tenants pt ON ep.property_tenant_id = pt.id
JOIN tenants t ON pt.tenant_id = t.id
JOIN properties p ON pt.property_id = p.id;

COMMENT ON VIEW all_payment_details IS 'Unified view of all payment types (rent, tax, electricity) with related property and tenant details';