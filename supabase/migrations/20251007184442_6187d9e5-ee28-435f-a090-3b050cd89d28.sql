-- Verify that the function exists before creating trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'send_push_on_notification'
    AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'Function send_push_on_notification does not exist';
  END IF;
  RAISE NOTICE 'Function send_push_on_notification verified';
END $$;

-- Drop all potential conflicting triggers
DROP TRIGGER IF EXISTS trigger_send_push_notification ON public.notifications;
DROP TRIGGER IF EXISTS send_push_on_notification_trigger ON public.notifications;
DROP TRIGGER IF EXISTS notify_push_trigger ON public.notifications;

-- Create the trigger robustly
CREATE TRIGGER trigger_send_push_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_push_on_notification();

-- Verify trigger was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trigger_send_push_notification'
    AND event_object_table = 'notifications'
  ) THEN
    RAISE EXCEPTION 'Trigger creation failed';
  END IF;
  RAISE NOTICE 'Trigger trigger_send_push_notification created and verified successfully';
END $$;

-- Add comment for documentation
COMMENT ON TRIGGER trigger_send_push_notification ON public.notifications IS 
  'Automatically sends push notifications via send-web-push edge function when a new notification is inserted';