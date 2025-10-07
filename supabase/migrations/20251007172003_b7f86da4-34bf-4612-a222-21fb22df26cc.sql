-- Create table to store push notification configuration securely
CREATE TABLE IF NOT EXISTS public.push_notification_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_token text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on push_notification_config
ALTER TABLE public.push_notification_config ENABLE ROW LEVEL SECURITY;

-- Only direction can manage push notification config
CREATE POLICY "Direction can manage push notification config"
  ON public.push_notification_config
  FOR ALL
  USING (has_role(auth.uid(), 'direction'::app_role))
  WITH CHECK (has_role(auth.uid(), 'direction'::app_role));

-- Drop and recreate the function with correct authentication
DROP FUNCTION IF EXISTS public.send_push_on_notification() CASCADE;

CREATE OR REPLACE FUNCTION public.send_push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_url TEXT;
  request_id BIGINT;
  admin_token_value TEXT;
BEGIN
  -- Get the admin token from config table
  SELECT admin_token INTO admin_token_value
  FROM public.push_notification_config
  LIMIT 1;

  -- Skip if no token configured
  IF admin_token_value IS NULL THEN
    RAISE WARNING 'Push notification skipped: No admin token configured';
    RETURN NEW;
  END IF;

  -- Build notification URL based on type
  notification_url := CASE
    WHEN NEW.type = 'intervention' THEN '/maintenance'
    WHEN NEW.type = 'maintenance_alert' THEN '/maintenance'
    WHEN NEW.type = 'maintenance_due' THEN '/maintenance'
    WHEN NEW.type = 'order_status' THEN '/orders'
    WHEN NEW.type = 'purchase_request_status' THEN '/orders'
    WHEN NEW.type = 'purchase_request_approval' THEN '/orders'
    WHEN NEW.type = 'stock_alert' THEN '/stock'
    WHEN NEW.type = 'stock_low' THEN '/stock'
    WHEN NEW.type = 'supply_request_completed' THEN '/supply-requests'
    WHEN NEW.type = 'message' THEN '/messagerie'
    WHEN NEW.type = 'thread_assigned' THEN '/messagerie'
    WHEN NEW.type = 'thread_mention' THEN '/messagerie'
    ELSE '/notifications'
  END;

  -- Call send-web-push edge function via pg_net with x-admin-token
  SELECT INTO request_id net.http_post(
    url := 'https://gdhiiynmlokocelkqsiz.supabase.co/functions/v1/send-web-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-token', admin_token_value
    ),
    body := jsonb_build_object(
      'userIds', ARRAY[NEW.user_id::text],
      'title', NEW.title,
      'body', COALESCE(NEW.message, ''),
      'url', notification_url
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the notification insert
    RAISE WARNING 'Failed to send push notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_send_push_notification ON public.notifications;
CREATE TRIGGER trigger_send_push_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_push_on_notification();

COMMENT ON FUNCTION public.send_push_on_notification() IS 
  'Automatically sends push notifications when a new notification is created. Uses admin token from push_notification_config table.';

COMMENT ON TABLE public.push_notification_config IS 
  'Stores the admin token for push notification authentication. Only accessible by direction role.';