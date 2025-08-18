-- SECURITY FIX: Remove conflicting and unsafe RLS policies on profiles table
-- This fixes the critical privilege escalation vulnerability

-- Drop the unsafe policy that allows unrestricted profile updates
DROP POLICY IF EXISTS "Users can update own profile safely" ON public.profiles;

-- Keep only the strict policy that prevents role/base_id changes by non-direction users
-- (The "Users can update their own profile limited" policy already exists and is secure)

-- Create a secure function for direction users to manage other profiles
CREATE OR REPLACE FUNCTION public.update_user_profile(
  target_user_id uuid,
  new_name text DEFAULT NULL,
  new_role user_role DEFAULT NULL,
  new_base_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only direction users can call this function
  IF get_user_role() != 'direction' THEN
    RAISE EXCEPTION 'Access denied: Only direction users can manage profiles';
  END IF;
  
  -- Update the profile with the provided values
  UPDATE public.profiles 
  SET 
    name = COALESCE(new_name, name),
    role = COALESCE(new_role, role),
    base_id = COALESCE(new_base_id, base_id)
  WHERE id = target_user_id;
  
  -- Log the profile change for audit
  INSERT INTO public.security_events (
    event_type,
    user_id,
    target_user_id,
    details
  ) VALUES (
    'profile_admin_update',
    auth.uid(),
    target_user_id,
    jsonb_build_object(
      'updated_fields', jsonb_build_object(
        'name', new_name,
        'role', new_role,
        'base_id', new_base_id
      ),
      'timestamp', now()
    )
  );
END;
$$;

-- Add security hardening to existing functions by setting search_path
-- Fix the most critical functions first

ALTER FUNCTION public.get_user_role() SET search_path TO 'public';
ALTER FUNCTION public.get_user_base_id() SET search_path TO 'public';
ALTER FUNCTION public.handle_new_user() SET search_path TO 'public';
ALTER FUNCTION public.log_profile_changes() SET search_path TO 'public';
ALTER FUNCTION public.advance_workflow_step(uuid, purchase_workflow_status, uuid, text) SET search_path TO 'public';
ALTER FUNCTION public.process_workflow_automation() SET search_path TO 'public';

-- Enhance the existing log_profile_changes function to log privilege escalation attempts
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log profile changes for security monitoring
  IF TG_OP = 'UPDATE' THEN
    -- Log ALL changes, not just role/base_id
    INSERT INTO public.profile_audit_log (
      profile_id,
      changed_by,
      old_data,
      new_data,
      action
    ) VALUES (
      NEW.id,
      auth.uid(),
      jsonb_build_object(
        'name', OLD.name,
        'role', OLD.role,
        'base_id', OLD.base_id
      ),
      jsonb_build_object(
        'name', NEW.name,
        'role', NEW.role,
        'base_id', NEW.base_id
      ),
      'UPDATE'
    );
    
    -- Log potential privilege escalation attempts
    IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.base_id IS DISTINCT FROM NEW.base_id) 
       AND auth.uid() != NEW.id 
       AND get_user_role() != 'direction' THEN
      INSERT INTO public.security_events (
        event_type,
        user_id,
        target_user_id,
        details
      ) VALUES (
        'privilege_escalation_attempt',
        auth.uid(),
        NEW.id,
        jsonb_build_object(
          'attempted_changes', jsonb_build_object(
            'old_role', OLD.role,
            'new_role', NEW.role,
            'old_base_id', OLD.base_id,
            'new_base_id', NEW.base_id
          ),
          'blocked', true,
          'timestamp', now()
        )
      );
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.profile_audit_log (
      profile_id,
      changed_by,
      old_data,
      new_data,
      action
    ) VALUES (
      NEW.id,
      COALESCE(auth.uid(), NEW.id),
      '{}',
      jsonb_build_object(
        'name', NEW.name,
        'role', NEW.role,
        'base_id', NEW.base_id
      ),
      'INSERT'
    );
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;