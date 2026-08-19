-- =========================================================
-- Marevo Maintenance outbound integration (additive only)
-- =========================================================

CREATE TABLE public.maintenance_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true,
  maintenance_api_url text NOT NULL,
  maintenance_api_key_encrypted text,
  webhook_secret text,
  marevo_tenant_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_integrations_singleton_chk CHECK (singleton),
  CONSTRAINT maintenance_integrations_singleton_uq UNIQUE (singleton)
);

-- Column level grants: the encrypted API key is NEVER readable from the client
GRANT SELECT (id, singleton, maintenance_api_url, webhook_secret, marevo_tenant_id, is_active, created_at, updated_at)
  ON public.maintenance_integrations TO authenticated;
GRANT ALL ON public.maintenance_integrations TO service_role;

ALTER TABLE public.maintenance_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Direction can view maintenance integration"
  ON public.maintenance_integrations FOR SELECT TO authenticated
  USING (public.get_user_role() = 'direction'::user_role);

CREATE TABLE public.maintenance_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  last_error text,
  request_payload jsonb,
  response_data jsonb,
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.maintenance_sync_log TO authenticated;
GRANT ALL ON public.maintenance_sync_log TO service_role;

ALTER TABLE public.maintenance_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Direction can view maintenance sync log"
  ON public.maintenance_sync_log FOR SELECT TO authenticated
  USING (public.get_user_role() = 'direction'::user_role);

CREATE INDEX idx_maintenance_sync_log_entity
  ON public.maintenance_sync_log (tenant_id, entity_type, entity_id);
CREATE INDEX idx_maintenance_sync_log_retry
  ON public.maintenance_sync_log (status, last_attempt_at);

CREATE TRIGGER update_maintenance_integrations_updated_at
  BEFORE UPDATE ON public.maintenance_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Fire-and-forget enqueue trigger (never blocks business tx)
-- =========================================================
CREATE OR REPLACE FUNCTION public.enqueue_maintenance_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_entity text;
  v_action text;
  v_id uuid;
  v_base uuid;
  v_integration public.maintenance_integrations;
  v_log_id uuid;
  v_fn text;
BEGIN
  v_entity := CASE TG_TABLE_NAME WHEN 'boat_rentals' THEN 'rental' WHEN 'boats' THEN 'boat' ELSE TG_TABLE_NAME END;
  v_action := CASE TG_OP WHEN 'INSERT' THEN 'create' WHEN 'UPDATE' THEN 'update' ELSE 'delete' END;

  IF TG_OP = 'DELETE' THEN
    v_id := OLD.id; v_base := OLD.base_id;
  ELSE
    v_id := NEW.id; v_base := NEW.base_id;
  END IF;

  SELECT * INTO v_integration FROM public.maintenance_integrations WHERE singleton LIMIT 1;

  IF v_integration.id IS NULL
     OR v_integration.is_active IS NOT TRUE
     OR coalesce(v_integration.maintenance_api_key_encrypted, '') = '' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.maintenance_sync_log
      WHERE entity_type = v_entity AND entity_id = v_id AND action = v_action
        AND last_error = 'no_integration'
    ) THEN
      INSERT INTO public.maintenance_sync_log (tenant_id, entity_type, entity_id, action, status, last_error)
      VALUES (v_base, v_entity, v_id, v_action, 'failed', 'no_integration');
    END IF;
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- no duplicate create sync
  IF v_action = 'create' AND EXISTS (
    SELECT 1 FROM public.maintenance_sync_log
    WHERE entity_type = v_entity AND entity_id = v_id AND action = 'create' AND status = 'success'
  ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO public.maintenance_sync_log (tenant_id, entity_type, entity_id, action, status)
  VALUES (v_base, v_entity, v_id, v_action, 'pending')
  RETURNING id INTO v_log_id;

  v_fn := CASE v_entity WHEN 'rental' THEN 'sync-rental-to-maintenance' ELSE 'sync-boat-to-maintenance' END;

  BEGIN
    PERFORM net.http_post(
      url := 'https://gdhiiynmlokocelkqsiz.supabase.co/functions/v1/' || v_fn,
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('log_id', v_log_id, 'entity_id', v_id, 'action', v_action),
      timeout_milliseconds := 3000
    );
  EXCEPTION WHEN OTHERS THEN
    -- pg_net unavailable: the cron retry worker will pick up the pending row
    NULL;
  END;

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_maintenance_sync() FROM anon, authenticated;

CREATE TRIGGER trg_maintenance_sync_boat_rentals
  AFTER INSERT OR UPDATE OR DELETE ON public.boat_rentals
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_maintenance_sync();

CREATE TRIGGER trg_maintenance_sync_boats
  AFTER INSERT OR UPDATE OR DELETE ON public.boats
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_maintenance_sync();

-- =========================================================
-- Retry worker (every 5 minutes)
-- =========================================================
SELECT cron.schedule(
  'retry-failed-maintenance-syncs',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://gdhiiynmlokocelkqsiz.supabase.co/functions/v1/retry-failed-maintenance-syncs',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $cron$
);