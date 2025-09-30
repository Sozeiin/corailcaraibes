-- Phase 2: Create administrative_checkin_forms table
CREATE TABLE public.administrative_checkin_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_id uuid NOT NULL REFERENCES public.bases(id),
  boat_id uuid REFERENCES public.boats(id),
  
  -- Informations client pré-remplies
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  customer_address text,
  customer_id_number text,
  
  -- Informations de location pré-remplies
  planned_start_date timestamp with time zone,
  planned_end_date timestamp with time zone,
  rental_notes text,
  special_instructions text,
  
  -- Méta-données
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Statut de la fiche
  status text DEFAULT 'ready' CHECK (status IN ('ready', 'used', 'expired')),
  
  -- Utilisé par le technicien
  used_by uuid REFERENCES auth.users(id),
  used_at timestamp with time zone,
  
  -- Index pour optimisation
  UNIQUE(base_id, customer_name, planned_start_date)
);

-- Enable RLS for administrative_checkin_forms
ALTER TABLE public.administrative_checkin_forms ENABLE ROW LEVEL SECURITY;

-- RLS policies for administrative_checkin_forms
CREATE POLICY "Direction chef_base and administratif can manage checkin forms" 
ON public.administrative_checkin_forms
FOR ALL 
USING ((get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role, 'administratif'::user_role])) 
       AND ((get_user_role() = 'direction'::user_role) OR (base_id = get_user_base_id())));

CREATE POLICY "Technicians can view and use forms from their base" 
ON public.administrative_checkin_forms
FOR SELECT 
USING (base_id = get_user_base_id());

CREATE POLICY "Technicians can update forms when using them" 
ON public.administrative_checkin_forms
FOR UPDATE 
USING (base_id = get_user_base_id() AND status = 'ready')
WITH CHECK (base_id = get_user_base_id());

-- Update existing RLS policies to include 'administratif' role

-- Boats policy update
DROP POLICY IF EXISTS "Direction and chef_base can manage boats" ON public.boats;
CREATE POLICY "Direction chef_base and administratif can manage boats" 
ON public.boats
FOR ALL 
USING ((get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role, 'administratif'::user_role])) 
       AND ((get_user_role() = 'direction'::user_role) OR (base_id = get_user_base_id())));

-- Stock items policy update  
DROP POLICY IF EXISTS "Direction and chef_base can manage stock items" ON public.stock_items;
CREATE POLICY "Direction chef_base and administratif can manage stock items" 
ON public.stock_items
FOR ALL 
USING ((get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role, 'administratif'::user_role])) 
       AND ((get_user_role() = 'direction'::user_role) OR (base_id = get_user_base_id())));

-- Interventions policy update
DROP POLICY IF EXISTS "Direction and chef_base can manage interventions" ON public.interventions;
CREATE POLICY "Direction chef_base and administratif can manage interventions" 
ON public.interventions
FOR ALL 
USING ((get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role, 'administratif'::user_role])) 
       AND ((get_user_role() = 'direction'::user_role) OR (base_id = get_user_base_id())));

-- Suppliers policy update
DROP POLICY IF EXISTS "Direction and chef_base can manage suppliers" ON public.suppliers;
CREATE POLICY "Direction chef_base and administratif can manage suppliers" 
ON public.suppliers
FOR ALL 
USING ((get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role, 'administratif'::user_role])) 
       AND ((get_user_role() = 'direction'::user_role) OR (base_id = get_user_base_id())));

-- Update get_user_page_permissions function
CREATE OR REPLACE FUNCTION public.get_user_page_permissions(user_id_param uuid)
RETURNS TABLE(page_permission page_permission, granted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role_val user_role;
  page_enum page_permission;
BEGIN
  -- Get user role
  SELECT role INTO user_role_val 
  FROM profiles 
  WHERE id = user_id_param;
  
  -- Direction, chef_base AND administratif always have all permissions
  IF user_role_val IN ('direction', 'chef_base', 'administratif') THEN
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