-- Create a secure view for public invitation verification
CREATE OR REPLACE VIEW public_invitation_view AS
SELECT 
  ti.id,
  ti.token,
  ti.status,
  ti.expires_at,
  p.id as property_id,
  p.property_name,
  p.address_line1,
  p.city,
  p.state,
  p.property_type,
  up.first_name as owner_first_name,
  up.last_name as owner_last_name,
  up.email as owner_email,
  up.phone as owner_phone,
  t.id as tenant_id,
  t.name as tenant_name,
  t.email as tenant_email,
  t.phone as tenant_phone,
  t.rental_type,
  t.rental_amount,
  t.maintenance_fee,
  t.rental_frequency,
  t.rental_start_date,
  t.rental_end_date
FROM tenant_invitations ti
JOIN properties p ON ti.property_id = p.id
JOIN user_profiles up ON p.owner_id = up.id
JOIN tenants t ON ti.tenant_id = t.id
WHERE ti.status = 'pending';

-- Grant SELECT permission to public
GRANT SELECT ON public_invitation_view TO anon;

-- Create index on token for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token_lookup 
ON tenant_invitations(token) 
WHERE status = 'pending';

-- Update invitation verification function to use the view
CREATE OR REPLACE FUNCTION verify_invitation(invitation_token TEXT)
RETURNS SETOF public_invitation_view
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT * FROM public_invitation_view 
  WHERE token = invitation_token 
  AND expires_at > NOW();
$$;