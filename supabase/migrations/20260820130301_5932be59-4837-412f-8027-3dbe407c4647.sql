ALTER TABLE public.administrative_checkin_forms
  ADD COLUMN IF NOT EXISTS marevo_booking_id text,
  ADD COLUMN IF NOT EXISTS marevo_synced_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS administrative_checkin_forms_marevo_booking_id_key
  ON public.administrative_checkin_forms (marevo_booking_id)
  WHERE marevo_booking_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enqueue_marevo_checkin_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cfg public.marevo_integration_config;
BEGIN
  SELECT * INTO cfg FROM public.marevo_integration_config WHERE singleton = true LIMIT 1;
  IF cfg.id IS NULL OR cfg.sync_enabled IS NOT TRUE OR cfg.sync_bookings_enabled IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'used' AND COALESCE(OLD.status, '') <> 'used' THEN
    PERFORM net.http_post(
      url := 'https://gdhiiynmlokocelkqsiz.supabase.co/functions/v1/marevo-sync',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('action', 'push_checkin', 'form_id', NEW.id)
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_marevo_checkin_event ON public.administrative_checkin_forms;
CREATE TRIGGER trg_marevo_checkin_event
AFTER UPDATE ON public.administrative_checkin_forms
FOR EACH ROW EXECUTE FUNCTION public.enqueue_marevo_checkin_event();

CREATE OR REPLACE FUNCTION public.enqueue_marevo_checkout_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cfg public.marevo_integration_config;
BEGIN
  SELECT * INTO cfg FROM public.marevo_integration_config WHERE singleton = true LIMIT 1;
  IF cfg.id IS NULL OR cfg.sync_enabled IS NOT TRUE OR cfg.sync_bookings_enabled IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('completed', 'cancelled') AND COALESCE(OLD.status, '') <> NEW.status THEN
    PERFORM net.http_post(
      url := 'https://gdhiiynmlokocelkqsiz.supabase.co/functions/v1/marevo-sync',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('action', 'push_checkout', 'rental_id', NEW.id)
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_marevo_sync_boat_rentals ON public.boat_rentals;
DROP TRIGGER IF EXISTS trg_marevo_checkout_event ON public.boat_rentals;
CREATE TRIGGER trg_marevo_checkout_event
AFTER UPDATE ON public.boat_rentals
FOR EACH ROW EXECUTE FUNCTION public.enqueue_marevo_checkout_event();