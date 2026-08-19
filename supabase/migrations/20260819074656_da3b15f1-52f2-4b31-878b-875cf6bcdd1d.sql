ALTER TABLE public.maintenance_integrations
  ADD COLUMN IF NOT EXISTS inbound_api_key text,
  ADD COLUMN IF NOT EXISTS inbound_api_key_created_at timestamptz;