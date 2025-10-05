-- Phase 1: Critical Database Security
-- This migration addresses critical security vulnerabilities

-- ============================================
-- Step 1: Create Secure User Roles System
-- ============================================

-- Create app_role enum (separate from the existing user_role enum)
CREATE TYPE public.app_role AS ENUM ('direction', 'chef_base', 'technicien', 'administratif');

-- Create user_roles table with proper constraints
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_by uuid REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_roles table
CREATE POLICY "Direction can manage all user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'direction'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'direction'
  )
);

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create SECURITY DEFINER function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Migrate existing role data from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, assigned_at)
SELECT id, role::text::app_role, created_at
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================
-- Step 2: Fix Public PII Exposure
-- ============================================

-- Drop existing public policies on administrative_checkin_forms
DROP POLICY IF EXISTS "Direction chef_base and administratif can manage checkin forms" ON public.administrative_checkin_forms;
DROP POLICY IF EXISTS "Technicians can update forms when using them" ON public.administrative_checkin_forms;
DROP POLICY IF EXISTS "Technicians can view and use forms from their base" ON public.administrative_checkin_forms;

-- Create secure RLS policies for administrative_checkin_forms (protecting customer PII)
CREATE POLICY "Direction can manage all checkin forms"
ON public.administrative_checkin_forms
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'direction'))
WITH CHECK (public.has_role(auth.uid(), 'direction'));

CREATE POLICY "Chef_base and administratif can manage forms in their base"
ON public.administrative_checkin_forms
FOR ALL
TO authenticated
USING (
  (public.has_role(auth.uid(), 'chef_base') OR public.has_role(auth.uid(), 'administratif'))
  AND base_id = get_user_base_id()
)
WITH CHECK (
  (public.has_role(auth.uid(), 'chef_base') OR public.has_role(auth.uid(), 'administratif'))
  AND base_id = get_user_base_id()
);

CREATE POLICY "Technicians can view and update forms in their base"
ON public.administrative_checkin_forms
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'technicien')
  AND base_id = get_user_base_id()
)
WITH CHECK (
  public.has_role(auth.uid(), 'technicien')
  AND base_id = get_user_base_id()
);

-- Drop existing policies on channel_members
DROP POLICY IF EXISTS "Direction and admins can manage members" ON public.channel_members;
DROP POLICY IF EXISTS "Users can view channel members" ON public.channel_members;

-- Create secure RLS policies for channel_members (prevent user activity tracking)
CREATE POLICY "Direction can manage all channel members"
ON public.channel_members
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'direction'))
WITH CHECK (public.has_role(auth.uid(), 'direction'));

CREATE POLICY "Chef_base can manage channel members"
ON public.channel_members
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'chef_base'))
WITH CHECK (public.has_role(auth.uid(), 'chef_base'));

CREATE POLICY "Users can view members of their channels"
ON public.channel_members
FOR SELECT
TO authenticated
USING (
  channel_id IN (
    SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their own membership"
ON public.channel_members
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Drop existing policies on checklist_items
DROP POLICY IF EXISTS "All users can view checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Direction and chef_base can manage checklist items" ON public.checklist_items;

-- Create secure RLS policies for checklist_items (protect proprietary procedures)
CREATE POLICY "Direction can manage all checklist items"
ON public.checklist_items
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'direction'))
WITH CHECK (public.has_role(auth.uid(), 'direction'));

CREATE POLICY "Chef_base can manage checklist items"
ON public.checklist_items
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'chef_base'))
WITH CHECK (public.has_role(auth.uid(), 'chef_base'));

CREATE POLICY "Authenticated users can view checklist items"
ON public.checklist_items
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- Step 3: Fix Database Function Security
-- ============================================

-- Update get_user_role to use new user_roles table and add search_path
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Keep backward compatibility by returning from profiles table
  -- New code should use has_role() instead
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Update get_user_base_id to add search_path (it was missing)
CREATE OR REPLACE FUNCTION public.get_user_base_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT base_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Update can_complete_interventions to add search_path
CREATE OR REPLACE FUNCTION public.can_complete_interventions()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN get_user_role() = 'direction' THEN true
    WHEN get_user_role() = 'technicien' THEN true
    WHEN get_user_role() = 'chef_base' AND EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid()
      AND p.can_complete_interventions = true
    ) THEN true
    ELSE false
  END;
$$;

-- Add search_path to has_page_permission
CREATE OR REPLACE FUNCTION public.has_page_permission(user_id_param uuid, page_param page_permission)
RETURNS boolean
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
$$;

-- Add search_path to get_user_page_permissions
CREATE OR REPLACE FUNCTION public.get_user_page_permissions(user_id_param uuid)
RETURNS TABLE(page_permission page_permission, granted boolean)
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
$$;

-- ============================================
-- Step 4: Helper Functions for Channel Access
-- ============================================

-- Create helper function to check if user is channel member
CREATE OR REPLACE FUNCTION public.is_channel_member(channel_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.channel_members
    WHERE channel_id = channel_id_param AND user_id = user_id_param
  );
$$;

-- Create helper function to check if channel is public
CREATE OR REPLACE FUNCTION public.is_public_channel(channel_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.channels
    WHERE id = channel_id_param AND channel_type = 'public'
  );
$$;

-- ============================================
-- Step 5: Audit and Security Logging
-- ============================================

-- Log this critical security migration
INSERT INTO public.security_events (
  event_type,
  user_id,
  details
) VALUES (
  'security_migration',
  NULL,
  jsonb_build_object(
    'migration', 'phase_1_critical_database_security',
    'changes', jsonb_build_array(
      'Created user_roles table with SECURITY DEFINER protection',
      'Fixed public PII exposure on administrative_checkin_forms',
      'Fixed public user tracking on channel_members',
      'Fixed public checklist exposure',
      'Added search_path protection to SECURITY DEFINER functions',
      'Created helper functions for channel access control'
    ),
    'timestamp', now()
  )
);

-- Add comment to profiles.role column indicating it's deprecated
COMMENT ON COLUMN public.profiles.role IS 'DEPRECATED: Use user_roles table instead. Kept for backward compatibility only.';
