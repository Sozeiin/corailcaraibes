-- Fix critical security vulnerability: Remove public access to bases table
-- This prevents unauthorized access to sensitive business information

-- First, drop the insecure public policy that allows unrestricted access
DROP POLICY IF EXISTS "Public can view bases for registration" ON public.bases;

-- Create a secure policy for registration that only exposes necessary data
-- This allows unauthenticated users to see only base names and IDs for registration purposes
-- but protects sensitive contact information
CREATE POLICY "Limited base info for registration" ON public.bases
FOR SELECT 
TO anon, authenticated
USING (true);

-- However, we need to ensure sensitive columns are protected
-- Let's create a view for public registration that only exposes safe data
CREATE OR REPLACE VIEW public.bases_public AS
SELECT 
  id,
  name,
  location
FROM public.bases;

-- Grant access to the view for anonymous users
GRANT SELECT ON public.bases_public TO anon;
GRANT SELECT ON public.bases_public TO authenticated;

-- Update the main policy to only allow authenticated users to see full base data
DROP POLICY IF EXISTS "Limited base info for registration" ON public.bases;

-- Create secure policies for authenticated users only
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

-- Ensure the management policy for direction users remains intact
-- (This should already exist, but let's make sure)
CREATE POLICY IF NOT EXISTS "Direction can manage all bases" ON public.bases
FOR ALL
TO authenticated
USING (get_user_role() = 'direction')
WITH CHECK (get_user_role() = 'direction');