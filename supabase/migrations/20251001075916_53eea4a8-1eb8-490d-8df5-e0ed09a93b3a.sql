-- Ajouter les nouvelles permissions à l'enum page_permission
ALTER TYPE page_permission ADD VALUE IF NOT EXISTS 'checkin';
ALTER TYPE page_permission ADD VALUE IF NOT EXISTS 'checkout';
ALTER TYPE page_permission ADD VALUE IF NOT EXISTS 'administrative_checkin';
ALTER TYPE page_permission ADD VALUE IF NOT EXISTS 'boats_dashboard';
ALTER TYPE page_permission ADD VALUE IF NOT EXISTS 'boats_fleet';
ALTER TYPE page_permission ADD VALUE IF NOT EXISTS 'boats_safety_controls';
ALTER TYPE page_permission ADD VALUE IF NOT EXISTS 'stock_inventory';
ALTER TYPE page_permission ADD VALUE IF NOT EXISTS 'stock_scanner';
ALTER TYPE page_permission ADD VALUE IF NOT EXISTS 'stock_shipments';
ALTER TYPE page_permission ADD VALUE IF NOT EXISTS 'maintenance_interventions';
ALTER TYPE page_permission ADD VALUE IF NOT EXISTS 'maintenance_preventive';
ALTER TYPE page_permission ADD VALUE IF NOT EXISTS 'maintenance_gantt';
ALTER TYPE page_permission ADD VALUE IF NOT EXISTS 'maintenance_history';

-- Mettre à jour la fonction get_user_page_permissions pour gérer les chef_base
CREATE OR REPLACE FUNCTION public.get_user_page_permissions(user_id_param uuid)
RETURNS TABLE(page_permission page_permission, granted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role_val user_role;
  page_enum page_permission;
BEGIN
  -- Get user role
  SELECT role INTO user_role_val 
  FROM profiles 
  WHERE id = user_id_param;
  
  -- Direction always has all permissions
  IF user_role_val = 'direction' THEN
    FOR page_enum IN SELECT unnest(enum_range(NULL::page_permission)) LOOP
      page_permission := page_enum;
      granted := TRUE;
      RETURN NEXT;
    END LOOP;
    RETURN;
  END IF;
  
  -- For chef_base and techniciens, check actual permissions with defaults
  IF user_role_val IN ('chef_base', 'technicien', 'administratif') THEN
    FOR page_enum IN SELECT unnest(enum_range(NULL::page_permission)) LOOP
      -- Check if there's an explicit permission set
      SELECT COALESCE(up.granted, TRUE) INTO granted
      FROM user_permissions up
      WHERE up.user_id = user_id_param AND up.page_permission = page_enum;
      
      page_permission := page_enum;
      RETURN NEXT;
    END LOOP;
    RETURN;
  END IF;
  
  -- Default empty for unknown roles
  RETURN;
END;
$function$;

-- Mettre à jour la fonction has_page_permission pour gérer chef_base
CREATE OR REPLACE FUNCTION public.has_page_permission(user_id_param uuid, page_param page_permission)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role_val user_role;
  permission_exists BOOLEAN;
  permission_granted BOOLEAN;
BEGIN
  -- Get user role
  SELECT role INTO user_role_val 
  FROM profiles 
  WHERE id = user_id_param;
  
  -- Direction always has all permissions
  IF user_role_val = 'direction' THEN
    RETURN TRUE;
  END IF;
  
  -- For chef_base, techniciens, and administratif, check explicit permissions
  IF user_role_val IN ('chef_base', 'technicien', 'administratif') THEN
    -- Check if permission record exists
    SELECT EXISTS(
      SELECT 1 FROM user_permissions 
      WHERE user_id = user_id_param AND page_permission = page_param
    ) INTO permission_exists;
    
    -- If no record exists, default to TRUE (full access by default)
    IF NOT permission_exists THEN
      RETURN TRUE;
    END IF;
    
    -- If record exists, check granted status
    SELECT granted INTO permission_granted
    FROM user_permissions 
    WHERE user_id = user_id_param AND page_permission = page_param;
    
    RETURN permission_granted;
  END IF;
  
  -- Default deny for unknown roles
  RETURN FALSE;
END;
$function$;