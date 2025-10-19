-- Drop existing function
DROP FUNCTION IF EXISTS public.delete_user_cascade(uuid);

-- Recreate comprehensive delete_user_cascade function
CREATE OR REPLACE FUNCTION public.delete_user_cascade(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id_param) THEN
    RAISE EXCEPTION 'User with id % does not exist', user_id_param;
  END IF;

  -- SET NULL for historical references in tables referencing profiles
  UPDATE topic_checklist_items SET completed_by = NULL WHERE completed_by = user_id_param;
  UPDATE topics SET created_by = NULL WHERE created_by = user_id_param;
  UPDATE topics SET assigned_to = NULL WHERE assigned_to = user_id_param;
  UPDATE topics SET closed_by = NULL WHERE closed_by = user_id_param;

  -- SET NULL for historical references in tables referencing auth.users
  UPDATE api_logs SET user_id = NULL WHERE user_id = user_id_param;
  UPDATE customers SET created_by = NULL WHERE created_by = user_id_param;
  UPDATE planning_templates SET created_by = NULL WHERE created_by = user_id_param;
  UPDATE preparation_checklist_templates SET created_by = NULL WHERE created_by = user_id_param;
  UPDATE response_templates SET created_by = NULL WHERE created_by = user_id_param;
  UPDATE security_events SET user_id = NULL WHERE user_id = user_id_param;
  UPDATE security_events SET target_user_id = NULL WHERE target_user_id = user_id_param;
  UPDATE smart_thread_entities SET linked_by = NULL WHERE linked_by = user_id_param;
  UPDATE stock_reservations SET reserved_by = NULL WHERE reserved_by = user_id_param;
  UPDATE thread_workflow_states SET resolved_by = NULL WHERE resolved_by = user_id_param;
  UPDATE thread_workflow_states SET assigned_to = NULL WHERE assigned_to = user_id_param;

  -- DELETE from junction/assignment tables
  DELETE FROM user_roles WHERE user_id = user_id_param;
  DELETE FROM dashboard_preferences WHERE user_id = user_id_param;
  DELETE FROM thread_assignments WHERE user_id = user_id_param;
  DELETE FROM thread_assignments WHERE assigned_by = user_id_param;
  DELETE FROM channel_members WHERE user_id = user_id_param;
  DELETE FROM user_permissions WHERE user_id = user_id_param;

  -- DELETE notifications and subscriptions
  DELETE FROM notifications WHERE user_id = user_id_param;
  DELETE FROM push_subscriptions WHERE user_id = user_id_param;

  -- DELETE profile audit logs
  DELETE FROM profile_audit_log WHERE profile_id = user_id_param;
  DELETE FROM profile_audit_log WHERE changed_by = user_id_param;

  -- DELETE login attempts
  DELETE FROM login_attempts WHERE user_id = user_id_param;

  -- Finally, delete the profile (this will cascade to auth.users via trigger)
  DELETE FROM profiles WHERE id = user_id_param;
  
  -- If profile deletion didn't cascade, delete from auth.users directly
  DELETE FROM auth.users WHERE id = user_id_param;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.delete_user_cascade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_cascade(uuid) TO anon;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';