-- 1. New Marevo integration schema
CREATE TABLE IF NOT EXISTS public.marevo_integration_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true,
  marevo_base_url text NOT NULL DEFAULT '',
  marevo_api_key text,
  marevo_tenant_id text,
  webhook_secret text,
  sync_enabled boolean NOT NULL DEFAULT false,
  sync_boats_enabled boolean NOT NULL DEFAULT true,
  sync_bookings_enabled boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marevo_integration_config_singleton_unique UNIQUE (singleton)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marevo_integration_config TO authenticated;
GRANT ALL ON public.marevo_integration_config TO service_role;
ALTER TABLE public.marevo_integration_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Direction manages marevo config"
ON public.marevo_integration_config FOR ALL TO authenticated
USING (public.get_user_role() = 'direction'::user_role)
WITH CHECK (public.get_user_role() = 'direction'::user_role);

CREATE TABLE IF NOT EXISTS public.marevo_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text,
  direction text NOT NULL DEFAULT 'outbound',
  endpoint text,
  entity_type text NOT NULL,
  entity_id uuid,
  request_payload jsonb,
  response_payload jsonb,
  http_status integer,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  attempt integer NOT NULL DEFAULT 1,
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marevo_sync_log_created_idx ON public.marevo_sync_log (created_at DESC);
CREATE INDEX IF NOT EXISTS marevo_sync_log_entity_idx ON public.marevo_sync_log (entity_type, entity_id);

GRANT SELECT ON public.marevo_sync_log TO authenticated;
GRANT ALL ON public.marevo_sync_log TO service_role;
ALTER TABLE public.marevo_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Direction reads marevo sync log"
ON public.marevo_sync_log FOR SELECT TO authenticated
USING (public.get_user_role() = 'direction'::user_role);

-- 2. Local link to the remote check-in form
ALTER TABLE public.boat_rentals ADD COLUMN IF NOT EXISTS marevo_checkin_form_id text;
ALTER TABLE public.boat_rentals ADD COLUMN IF NOT EXISTS marevo_synced_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_marevo_config_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marevo_config_updated_at ON public.marevo_integration_config;
CREATE TRIGGER trg_marevo_config_updated_at
BEFORE UPDATE ON public.marevo_integration_config
FOR EACH ROW EXECUTE FUNCTION public.set_marevo_config_updated_at();

-- 3. Outbound triggers (pg_net -> marevo-sync)
CREATE OR REPLACE FUNCTION public.enqueue_marevo_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cfg public.marevo_integration_config;
  fn_url text;
  body jsonb;
  entity uuid;
  act text;
BEGIN
  SELECT * INTO cfg FROM public.marevo_integration_config WHERE singleton = true LIMIT 1;
  IF cfg.id IS NULL OR cfg.sync_enabled IS NOT TRUE THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  act := lower(TG_OP);
  IF TG_OP = 'INSERT' THEN act := 'create';
  ELSIF TG_OP = 'UPDATE' THEN act := 'update';
  ELSE act := 'delete';
  END IF;

  entity := COALESCE(NEW.id, OLD.id);
  fn_url := 'https://gdhiiynmlokocelkqsiz.supabase.co/functions/v1/marevo-sync';

  IF TG_TABLE_NAME = 'boats' THEN
    IF cfg.sync_boats_enabled IS NOT TRUE THEN RETURN COALESCE(NEW, OLD); END IF;
    body := jsonb_build_object('action', 'push_boat', 'boat_id', entity, 'boat_action', act);
  ELSE
    IF cfg.sync_bookings_enabled IS NOT TRUE THEN RETURN COALESCE(NEW, OLD); END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    body := jsonb_build_object('action', 'push_booking', 'booking_id', entity);
  END IF;

  PERFORM net.http_post(
    url := fn_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := body
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Remove the previous integration (replaced by the Marevo schema above)
DROP TRIGGER IF EXISTS trg_maintenance_sync_boat_rentals ON public.boat_rentals;
DROP TRIGGER IF EXISTS trg_maintenance_sync_boats ON public.boats;
DROP FUNCTION IF EXISTS public.enqueue_maintenance_sync() CASCADE;
DROP TABLE IF EXISTS public.maintenance_sync_log;
DROP TABLE IF EXISTS public.maintenance_integrations;

CREATE TRIGGER trg_marevo_sync_boat_rentals
AFTER INSERT OR UPDATE ON public.boat_rentals
FOR EACH ROW EXECUTE FUNCTION public.enqueue_marevo_sync();

CREATE TRIGGER trg_marevo_sync_boats
AFTER INSERT OR UPDATE OR DELETE ON public.boats
FOR EACH ROW EXECUTE FUNCTION public.enqueue_marevo_sync();

-- 5. Cron: full sync every 15 minutes, drop the old retry job
DO $$
BEGIN
  PERFORM cron.unschedule('retry-failed-maintenance-syncs');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('marevo-sync-all-15min');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'marevo-sync-all-15min',
  '*/15 * * * *',
  $$select net.http_post(
      url := 'https://gdhiiynmlokocelkqsiz.supabase.co/functions/v1/marevo-sync',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := '{"action":"sync_all"}'::jsonb
    );$$
);