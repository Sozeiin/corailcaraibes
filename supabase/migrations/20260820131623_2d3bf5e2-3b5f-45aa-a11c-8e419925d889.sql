ALTER TABLE public.marevo_integration_config
  ADD COLUMN IF NOT EXISTS marevo_api_base_url text NOT NULL DEFAULT 'https://marevobooking.base44.app/api',
  ADD COLUMN IF NOT EXISTS marevo_app_id text;