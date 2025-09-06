-- Fix critical security vulnerability: Remove public access to bases table
-- This prevents unauthorized access to sensitive business information

-- First, drop the insecure public policy that allows unrestricted access
DROP POLICY IF EXISTS "Public can view bases for registration" ON public.bases;

-- Create a secure view for public registration that only exposes safe data
CREATE OR REPLACE VIEW public.bases_public AS
SELECT 
  id,
  name,
  location
FROM public.bases;

-- Grant access to the view for anonymous users (for registration purposes)
GRANT SELECT ON public.bases_public TO anon;
GRANT SELECT ON public.bases_public TO authenticated;

-- Create secure policy for authenticated users only to access full base data
CREATE POLICY "Authenticated users can view base info" ON public.bases
FOR SELECT 
TO authenticated
USING (
  -- Direction can see all bases
  get_user_role() = 'direction'
  OR
  -- Chef base and technicians can see their own base
  (get_user_role() = ANY (ARRAY['chef_base'::user_role, 'technicien'::user_role]) AND id = get_user_base_id())
);