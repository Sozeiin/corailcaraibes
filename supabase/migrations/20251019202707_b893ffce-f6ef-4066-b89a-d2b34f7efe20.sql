-- Drop existing function first
DROP FUNCTION IF EXISTS public.delete_user_cascade(uuid);

-- Recreate the function without referencing non-existent columns
CREATE OR REPLACE FUNCTION public.delete_user_cascade(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id_param) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Set NULL for all foreign key references to preserve history
  UPDATE boat_checklists SET technician_id = NULL WHERE technician_id = user_id_param;
  UPDATE boat_safety_controls SET performed_by = NULL WHERE performed_by = user_id_param;
  UPDATE boat_safety_controls SET validated_by = NULL WHERE validated_by = user_id_param;
  UPDATE channels SET created_by = NULL WHERE created_by = user_id_param;
  UPDATE checkin_checkout_orders SET created_by = NULL WHERE created_by = user_id_param;
  UPDATE checkin_checkout_orders SET technician_id = NULL WHERE technician_id = user_id_param;
  UPDATE interventions SET technician_id = NULL WHERE technician_id = user_id_param;
  UPDATE maintenance_manuals SET created_by = NULL WHERE created_by = user_id_param;
  UPDATE maintenance_tasks SET assigned_to = NULL WHERE assigned_to = user_id_param;
  UPDATE messages SET author_id = NULL WHERE author_id = user_id_param;
  UPDATE orders SET requested_by = NULL WHERE requested_by = user_id_param;
  UPDATE orders SET approved_by = NULL WHERE approved_by = user_id_param;
  UPDATE purchasing_templates SET created_by = NULL WHERE created_by = user_id_param;
  UPDATE boat_preparation_checklists SET technician_id = NULL WHERE technician_id = user_id_param;
  UPDATE planning_activities SET technician_id = NULL WHERE technician_id = user_id_param;
  UPDATE supply_requests SET requested_by = NULL WHERE requested_by = user_id_param;
  UPDATE workflow_notifications SET recipient_user_id = NULL WHERE recipient_user_id = user_id_param;
  UPDATE administrative_checkin_forms SET created_by = NULL WHERE created_by = user_id_param;
  UPDATE administrative_checkin_forms SET used_by = NULL WHERE used_by = user_id_param;
  UPDATE boat_documents SET uploaded_by = NULL WHERE uploaded_by = user_id_param;
  UPDATE bulk_purchase_campaigns SET created_by = NULL WHERE created_by = user_id_param;
  UPDATE bulk_purchase_templates SET created_by = NULL WHERE created_by = user_id_param;
  
  -- Delete channel memberships
  DELETE FROM channel_members WHERE user_id = user_id_param;
  
  -- Delete thread assignments
  DELETE FROM thread_assignees WHERE user_id = user_id_param;
  
  -- Delete user permissions
  DELETE FROM user_permissions WHERE user_id = user_id_param;
  
  -- Delete push subscriptions
  DELETE FROM push_subscriptions WHERE user_id = user_id_param;
  
  -- Delete notifications
  DELETE FROM notifications WHERE user_id = user_id_param;
  
  -- Delete from profiles (this will cascade to auth.users via trigger)
  DELETE FROM profiles WHERE id = user_id_param;
  
  RETURN TRUE;
END;
$function$;