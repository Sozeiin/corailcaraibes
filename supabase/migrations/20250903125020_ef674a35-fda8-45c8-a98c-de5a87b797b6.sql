-- Create enum for page permissions
CREATE TYPE public.page_permission AS ENUM (
  'dashboard',
  'boats',
  'safety_controls', 
  'suppliers',
  'orders',
  'stock',
  'stock_scanner',
  'maintenance',
  'maintenance_gantt',
  'maintenance_history',
  'maintenance_preventive',
  'notifications',
  'supply_requests'
);

-- Create user permissions table
CREATE TABLE public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_permission page_permission NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, page_permission)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Direction can manage all user permissions"
ON public.user_permissions
FOR ALL
USING (get_user_role() = 'direction');

CREATE POLICY "Users can view their own permissions"
ON public.user_permissions  
FOR SELECT
USING (user_id = auth.uid());

-- Function to check if user has page permission
CREATE OR REPLACE FUNCTION public.has_page_permission(user_id_param UUID, page_param page_permission)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_val user_role;
  permission_exists BOOLEAN;
  permission_granted BOOLEAN;
BEGIN
  -- Get user role
  SELECT role INTO user_role_val 
  FROM profiles 
  WHERE id = user_id_param;
  
  -- Direction and chef_base always have all permissions
  IF user_role_val IN ('direction', 'chef_base') THEN
    RETURN TRUE;
  END IF;
  
  -- For technicians, check explicit permissions
  IF user_role_val = 'technicien' THEN
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
$$;

-- Function to get user page permissions
CREATE OR REPLACE FUNCTION public.get_user_page_permissions(user_id_param UUID)
RETURNS TABLE(page_permission page_permission, granted BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_val user_role;
  page_enum page_permission;
BEGIN
  -- Get user role
  SELECT role INTO user_role_val 
  FROM profiles 
  WHERE id = user_id_param;
  
  -- Direction and chef_base always have all permissions
  IF user_role_val IN ('direction', 'chef_base') THEN
    FOR page_enum IN SELECT unnest(enum_range(NULL::page_permission)) LOOP
      page_permission := page_enum;
      granted := TRUE;
      RETURN NEXT;
    END LOOP;
    RETURN;
  END IF;
  
  -- For technicians, return actual permissions with defaults
  IF user_role_val = 'technicien' THEN
    FOR page_enum IN SELECT unnest(enum_range(NULL::page_permission)) LOOP
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
$$;

-- Trigger for updated_at
CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();