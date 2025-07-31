-- Critical Security Fix: Update existing functions to use SECURITY DEFINER
-- without dropping them to avoid dependency conflicts

-- Update get_user_role function to include SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Update get_user_base_id function to include SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_user_base_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT base_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies for profiles table to fix role management vulnerability
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Direction can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Direction can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Chef de base et direction can view profiles in their base" ON public.profiles;

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Policy 2: Users can update their own profile (but NOT role or base_id)
-- This prevents the role management vulnerability
CREATE POLICY "Users can update their own profile limited" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  AND base_id = (SELECT base_id FROM public.profiles WHERE id = auth.uid())
);

-- Policy 3: Only direction can view all profiles
CREATE POLICY "Direction can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (get_user_role() = 'direction');

-- Policy 4: Only direction can manage user roles and base assignments
CREATE POLICY "Direction can manage profiles" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (get_user_role() = 'direction')
WITH CHECK (get_user_role() = 'direction');

-- Policy 5: System can insert profiles (for user registration)
CREATE POLICY "System can insert profiles" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- Create an audit log for profile changes (security monitoring)
CREATE TABLE IF NOT EXISTS public.profile_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL,
  changed_by uuid NOT NULL,
  old_data jsonb,
  new_data jsonb,
  action text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.profile_audit_log ENABLE ROW LEVEL SECURITY;

-- Only direction can view audit logs
CREATE POLICY "Direction can view audit logs" 
ON public.profile_audit_log 
FOR SELECT 
TO authenticated
USING (get_user_role() = 'direction');

-- Trigger function for profile audit logging
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log profile changes for security monitoring
  IF TG_OP = 'UPDATE' THEN
    -- Only log if role or base_id changed (sensitive fields)
    IF OLD.role IS DISTINCT FROM NEW.role OR OLD.base_id IS DISTINCT FROM NEW.base_id THEN
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
          'role', OLD.role,
          'base_id', OLD.base_id
        ),
        jsonb_build_object(
          'role', NEW.role,
          'base_id', NEW.base_id
        ),
        'UPDATE'
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

-- Create trigger for profile audit logging
DROP TRIGGER IF EXISTS profile_audit_trigger ON public.profiles;
CREATE TRIGGER profile_audit_trigger
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_changes();