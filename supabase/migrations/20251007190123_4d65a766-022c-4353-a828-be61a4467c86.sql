-- 1. Recréer la fonction avec SECURITY DEFINER explicite
CREATE OR REPLACE FUNCTION public.send_push_on_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_token_value TEXT;
  base_url TEXT;
BEGIN
  -- Récupérer le token admin
  SELECT admin_token INTO admin_token_value
  FROM public.push_notification_config
  LIMIT 1;

  IF admin_token_value IS NULL THEN
    RAISE WARNING 'Admin token not configured in push_notification_config';
    RETURN NEW;
  END IF;

  base_url := 'https://gdhiiynmlokocelkqsiz.supabase.co';

  BEGIN
    PERFORM net.http_post(
      url := base_url || '/functions/v1/send-web-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-admin-token', admin_token_value
      ),
      body := jsonb_build_object(
        'userIds', jsonb_build_array(NEW.user_id::text),
        'title', NEW.title,
        'body', NEW.message,
        'url', '/notifications'
      )
    );
    
    RAISE LOG 'Push notification sent for notification_id: %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to send push: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- 2. Supprimer tous les triggers avec CASCADE
DROP TRIGGER IF EXISTS trigger_send_push_notification ON public.notifications CASCADE;
DROP TRIGGER IF EXISTS send_push_on_notification_trigger ON public.notifications CASCADE;
DROP TRIGGER IF EXISTS notify_push_trigger ON public.notifications CASCADE;

-- 3. Créer le trigger avec permissions explicites
CREATE TRIGGER trigger_send_push_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  WHEN (NEW.type IS NOT NULL)
  EXECUTE FUNCTION public.send_push_on_notification();

-- 4. Vérification STRICTE dans pg_trigger
DO $$
DECLARE
  trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'notifications'
      AND t.tgname = 'trigger_send_push_notification'
  ) INTO trigger_exists;
  
  IF NOT trigger_exists THEN
    RAISE EXCEPTION 'CRITICAL: Trigger was not created! Check permissions.';
  END IF;
  
  RAISE NOTICE '✅ SUCCESS: Trigger created and verified in pg_trigger catalog';
END $$;

-- 5. Grant explicit permissions
GRANT EXECUTE ON FUNCTION public.send_push_on_notification() TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_push_on_notification() TO service_role;

-- 6. Test automatique après 2 secondes
DO $$
BEGIN
  PERFORM pg_sleep(2);
  
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    '3f8beb77-6e0d-4284-91b3-428a1a09823e',
    'system_test',
    '✅ Trigger Test',
    'Si vous voyez cette notification push, le système fonctionne !',
    '{"test": true}'::jsonb
  );
  
  RAISE NOTICE '📤 Test notification inserted - check push notification on device';
END $$;