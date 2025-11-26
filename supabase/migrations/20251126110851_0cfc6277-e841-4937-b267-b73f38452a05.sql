-- Étape 1: Ajouter les colonnes de sauvegarde du nom utilisateur
ALTER TABLE public.interventions 
  ADD COLUMN IF NOT EXISTS technician_name TEXT,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;

ALTER TABLE public.boat_checklists 
  ADD COLUMN IF NOT EXISTS technician_name TEXT;

ALTER TABLE public.boat_safety_controls 
  ADD COLUMN IF NOT EXISTS performed_by_name TEXT,
  ADD COLUMN IF NOT EXISTS validated_by_name TEXT;

ALTER TABLE public.boat_preparation_checklists 
  ADD COLUMN IF NOT EXISTS technician_name TEXT;

ALTER TABLE public.planning_activities 
  ADD COLUMN IF NOT EXISTS technician_name TEXT;

ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS requested_by_name TEXT;

ALTER TABLE public.customers 
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;

ALTER TABLE public.boat_documents 
  ADD COLUMN IF NOT EXISTS uploaded_by_name TEXT;

-- Étape 2: Mettre à jour la fonction delete_user_cascade pour sauvegarder les noms
CREATE OR REPLACE FUNCTION public.delete_user_cascade(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_name_value TEXT;
BEGIN
  -- Récupérer le nom de l'utilisateur avant toute modification
  SELECT name INTO user_name_value FROM public.profiles WHERE id = user_id_param;
  
  -- Si pas de nom trouvé, utiliser l'email
  IF user_name_value IS NULL THEN
    SELECT email INTO user_name_value FROM public.profiles WHERE id = user_id_param;
  END IF;
  
  -- Sauvegarder le nom dans les tables d'historique AVANT de mettre à NULL les références
  
  -- Interventions
  UPDATE public.interventions 
  SET 
    technician_name = COALESCE(technician_name, user_name_value),
    technician_id = NULL 
  WHERE technician_id = user_id_param;
  
  UPDATE public.interventions 
  SET 
    created_by_name = COALESCE(created_by_name, user_name_value),
    created_by = NULL 
  WHERE created_by = user_id_param;
  
  -- Boat checklists
  UPDATE public.boat_checklists 
  SET 
    technician_name = COALESCE(technician_name, user_name_value),
    technician_id = NULL 
  WHERE technician_id = user_id_param;
  
  -- Safety controls
  UPDATE public.boat_safety_controls 
  SET 
    performed_by_name = COALESCE(performed_by_name, user_name_value),
    performed_by = NULL 
  WHERE performed_by = user_id_param;
  
  UPDATE public.boat_safety_controls 
  SET 
    validated_by_name = COALESCE(validated_by_name, user_name_value),
    validated_by = NULL 
  WHERE validated_by = user_id_param;
  
  -- Boat preparation checklists
  UPDATE public.boat_preparation_checklists 
  SET 
    technician_name = COALESCE(technician_name, user_name_value),
    technician_id = NULL 
  WHERE technician_id = user_id_param;
  
  -- Planning activities
  UPDATE public.planning_activities 
  SET 
    technician_name = COALESCE(technician_name, user_name_value),
    technician_id = NULL 
  WHERE technician_id = user_id_param;
  
  -- Orders
  UPDATE public.orders 
  SET 
    requested_by_name = COALESCE(requested_by_name, user_name_value),
    requested_by = NULL 
  WHERE requested_by = user_id_param;
  
  -- Customers
  UPDATE public.customers 
  SET 
    created_by_name = COALESCE(created_by_name, user_name_value),
    created_by = NULL 
  WHERE created_by = user_id_param;
  
  -- Boat documents
  UPDATE public.boat_documents 
  SET 
    uploaded_by_name = COALESCE(uploaded_by_name, user_name_value),
    uploaded_by = NULL 
  WHERE uploaded_by = user_id_param;
  
  -- Maintenance manuals
  UPDATE public.maintenance_manuals 
  SET created_by = NULL 
  WHERE created_by = user_id_param;
  
  -- Boat rentals
  UPDATE public.boat_rentals 
  SET customer_id = NULL 
  WHERE customer_id = user_id_param;
  
  -- Shipment preparations
  UPDATE public.shipment_preparations 
  SET created_by = NULL 
  WHERE created_by = user_id_param;
  
  -- Supply requests
  UPDATE public.supply_requests 
  SET requested_by = NULL 
  WHERE requested_by = user_id_param;
  
  -- Checkin checkout orders
  UPDATE public.checkin_checkout_orders 
  SET 
    created_by = NULL,
    technician_id = NULL 
  WHERE created_by = user_id_param OR technician_id = user_id_param;
  
  -- SUPPRESSION des données spécifiques à l'utilisateur
  DELETE FROM public.administrative_checkin_forms WHERE created_by = user_id_param;
  DELETE FROM public.user_permissions WHERE user_id = user_id_param;
  DELETE FROM public.notifications WHERE user_id = user_id_param;
  DELETE FROM public.workflow_notifications WHERE recipient_user_id = user_id_param;
  DELETE FROM public.dashboard_preferences WHERE user_id = user_id_param;
  DELETE FROM public.push_subscriptions WHERE user_id = user_id_param;
  DELETE FROM public.channel_members WHERE user_id = user_id_param;
  DELETE FROM public.thread_assignees WHERE user_id = user_id_param;
  
  -- Supprimer le profil (cela déclenchera aussi la suppression de auth.users)
  DELETE FROM public.profiles WHERE id = user_id_param;
END;
$function$;