-- 1. Supprimer les RLS policies qui dépendent de tenant_id
DROP POLICY IF EXISTS "Direction can delete profiles in their tenant" ON profiles;
DROP POLICY IF EXISTS "Direction can view all profiles in their tenant" ON profiles;
DROP POLICY IF EXISTS "Direction can insert profiles in their tenant" ON profiles;
DROP POLICY IF EXISTS "Direction can update profiles in their tenant" ON profiles;

-- 2. Supprimer les foreign keys
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_tenant_id_fkey;
ALTER TABLE push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_tenant_id_fkey;
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_tenant_id_fkey;
ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_tenant_id_fkey;

-- 3. Supprimer les colonnes tenant_id
ALTER TABLE profiles DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE push_subscriptions DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE stock_movements DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE user_roles DROP COLUMN IF EXISTS tenant_id;

-- 4. Supprimer la fonction get_user_tenant_id
DROP FUNCTION IF EXISTS public.get_user_tenant_id();

-- 5. Supprimer la table tenants
DROP TABLE IF EXISTS public.tenants CASCADE;

-- 6. Recréer les policies pour profiles sans tenant_id
CREATE POLICY "Direction can manage all profiles"
ON public.profiles FOR ALL
USING (has_role(auth.uid(), 'direction'::app_role))
WITH CHECK (has_role(auth.uid(), 'direction'::app_role));

-- 7. Corriger la fonction delete_user_cascade
CREATE OR REPLACE FUNCTION public.delete_user_cascade(user_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name_value TEXT;
BEGIN
  SELECT name INTO user_name_value FROM public.profiles WHERE id = user_id_param;
  
  IF user_name_value IS NULL THEN
    SELECT email INTO user_name_value FROM public.profiles WHERE id = user_id_param;
  END IF;
  
  UPDATE public.interventions 
  SET technician_name = COALESCE(technician_name, user_name_value), technician_id = NULL 
  WHERE technician_id = user_id_param;
  
  UPDATE public.interventions 
  SET created_by_name = COALESCE(created_by_name, user_name_value), created_by = NULL 
  WHERE created_by = user_id_param;
  
  UPDATE public.boat_checklists 
  SET technician_name = COALESCE(technician_name, user_name_value), technician_id = NULL 
  WHERE technician_id = user_id_param;
  
  UPDATE public.boat_safety_controls 
  SET performed_by_name = COALESCE(performed_by_name, user_name_value), performed_by = NULL 
  WHERE performed_by = user_id_param;
  
  UPDATE public.boat_safety_controls 
  SET validated_by_name = COALESCE(validated_by_name, user_name_value), validated_by = NULL 
  WHERE validated_by = user_id_param;
  
  UPDATE public.boat_preparation_checklists 
  SET technician_name = COALESCE(technician_name, user_name_value), technician_id = NULL 
  WHERE technician_id = user_id_param;
  
  UPDATE public.planning_activities 
  SET technician_name = COALESCE(technician_name, user_name_value), technician_id = NULL 
  WHERE technician_id = user_id_param;
  
  UPDATE public.orders 
  SET requested_by_name = COALESCE(requested_by_name, user_name_value), requested_by = NULL 
  WHERE requested_by = user_id_param;
  
  UPDATE public.customers 
  SET created_by_name = COALESCE(created_by_name, user_name_value), created_by = NULL 
  WHERE created_by = user_id_param;
  
  UPDATE public.boat_documents 
  SET uploaded_by_name = COALESCE(uploaded_by_name, user_name_value), uploaded_by = NULL 
  WHERE uploaded_by = user_id_param;
  
  UPDATE public.maintenance_manuals SET created_by = NULL WHERE created_by = user_id_param;
  UPDATE public.boat_rentals SET customer_id = NULL WHERE customer_id = user_id_param;
  UPDATE public.shipment_preparations SET created_by = NULL WHERE created_by = user_id_param;
  UPDATE public.supply_requests SET requested_by = NULL WHERE requested_by = user_id_param;
  
  UPDATE public.checkin_checkout_orders 
  SET created_by = NULL, technician_id = NULL 
  WHERE created_by = user_id_param OR technician_id = user_id_param;
  
  DELETE FROM public.administrative_checkin_forms WHERE created_by = user_id_param;
  DELETE FROM public.user_permissions WHERE user_id = user_id_param;
  DELETE FROM public.notifications WHERE user_id = user_id_param;
  DELETE FROM public.dashboard_preferences WHERE user_id = user_id_param;
  DELETE FROM public.push_subscriptions WHERE user_id = user_id_param;
  DELETE FROM public.channel_members WHERE user_id = user_id_param;
  DELETE FROM public.thread_assignees WHERE user_id = user_id_param;
  DELETE FROM public.user_roles WHERE user_id = user_id_param;
  DELETE FROM public.profiles WHERE id = user_id_param;
END;
$$;

-- 8. Corriger la fonction handle_new_user (supprimer tenant_id)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, base_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'technicien')::public.user_role,
    COALESCE(NEW.raw_user_meta_data->>'base_id', '550e8400-e29b-41d4-a716-446655440001')::uuid
  );
  RETURN NEW;
END;
$$;