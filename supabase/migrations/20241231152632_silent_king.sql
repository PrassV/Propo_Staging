-- Create agreement cache table
CREATE TABLE agreement_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Create index for cache lookup
CREATE INDEX idx_agreement_cache_key ON agreement_cache(cache_key);

-- Create function to clean expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_agreements()
RETURNS void AS $$
BEGIN
  DELETE FROM agreement_cache
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE agreement_cache ENABLE ROW LEVEL SECURITY;

-- Create policy for read access
CREATE POLICY "Anyone can read agreement cache"
  ON agreement_cache FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for insert/update
CREATE POLICY "Service role can manage agreement cache"
  ON agreement_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);