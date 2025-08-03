-- Fix infinite recursion in security_events policy
DROP POLICY IF EXISTS "Direction can view security events" ON public.security_events;

-- Create the policy using the existing security definer function
CREATE POLICY "Direction can view security events" 
ON public.security_events 
FOR SELECT 
USING (get_user_role() = 'direction'::user_role);