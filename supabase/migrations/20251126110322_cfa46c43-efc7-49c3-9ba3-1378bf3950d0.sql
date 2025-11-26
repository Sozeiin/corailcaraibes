-- Fix delete_user_cascade to handle boat_sharing foreign key
CREATE OR REPLACE FUNCTION public.delete_user_cascade(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id_param) THEN
    RAISE EXCEPTION 'User with id % does not exist', user_id_param;
  END IF;

  -- Get user email for login_attempts cleanup
  SELECT email INTO user_email FROM profiles WHERE id = user_id_param;

  -- SET NULL for boat_sharing references before deleting administrative forms
  UPDATE boat_sharing 
  SET checkin_form_id = NULL 
  WHERE checkin_form_id IN (
    SELECT id FROM administrative_checkin_forms 
    WHERE created_by = user_id_param OR used_by = user_id_param
  );

  -- DELETE records that require the user (NOT NULL constraints)
  DELETE FROM administrative_checkin_forms WHERE created_by = user_id_param;
  DELETE FROM administrative_checkin_forms WHERE used_by = user_id_param;
  DELETE FROM checkin_checkout_orders WHERE created_by = user_id_param;

  -- SET NULL for historical references in tables referencing profiles
  UPDATE topic_checklist_items SET completed_by = NULL WHERE completed_by = user_id_param;
  UPDATE topics SET created_by = NULL WHERE created_by = user_id_param;
  UPDATE topics SET assigned_to = NULL WHERE assigned_to = user_id_param;
  UPDATE topics SET closed_by = NULL WHERE closed_by = user_id_param;
  UPDATE interventions SET technician_id = NULL WHERE technician_id = user_id_param;
  UPDATE boat_checklists SET technician_id = NULL WHERE technician_id = user_id_param;
  UPDATE boat_safety_controls SET performed_by = NULL WHERE performed_by = user_id_param;
  UPDATE boat_safety_controls SET validated_by = NULL WHERE validated_by = user_id_param;
  UPDATE boat_preparation_checklists SET technician_id = NULL WHERE technician_id = user_id_param;
  UPDATE checkin_checkout_orders SET technician_id = NULL WHERE technician_id = user_id_param;
  UPDATE planning_activities SET technician_id = NULL WHERE technician_id = user_id_param;
  UPDATE maintenance_manuals SET created_by = NULL WHERE created_by = user_id_param;
  UPDATE orders SET requested_by = NULL WHERE requested_by = user_id_param;

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
  UPDATE bulk_purchase_campaigns SET created_by = NULL WHERE created_by = user_id_param;
  UPDATE bulk_purchase_templates SET created_by = NULL WHERE created_by = user_id_param;
  UPDATE boat_base_transfers SET transferred_by = NULL WHERE transferred_by = user_id_param;
  UPDATE boat_documents SET uploaded_by = NULL WHERE uploaded_by = user_id_param;

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

  -- DELETE login attempts by email (table uses email, not user_id)
  IF user_email IS NOT NULL THEN
    DELETE FROM login_attempts WHERE email = user_email;
  END IF;

  -- Finally, delete the profile (this will cascade to auth.users via trigger)
  DELETE FROM profiles WHERE id = user_id_param;
  
  -- If profile deletion didn't cascade, delete from auth.users directly
  DELETE FROM auth.users WHERE id = user_id_param;
END;
$$;