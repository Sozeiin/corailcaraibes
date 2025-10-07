-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to send push notifications automatically when a notification is created
CREATE OR REPLACE FUNCTION public.send_push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_url TEXT;
  request_id BIGINT;
BEGIN
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

  -- Call send-web-push edge function via pg_net
  SELECT INTO request_id net.http_post(
    url := 'https://gdhiiynmlokocelkqsiz.supabase.co/functions/v1/send-web-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('request.jwt.claims', true)::json->>'role'
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

-- Create trigger on notifications table
DROP TRIGGER IF EXISTS trigger_send_push_notification ON public.notifications;
CREATE TRIGGER trigger_send_push_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_push_on_notification();

-- Add comment for documentation
COMMENT ON FUNCTION public.send_push_on_notification() IS 
  'Automatically sends push notifications when a new notification is created in the notifications table';