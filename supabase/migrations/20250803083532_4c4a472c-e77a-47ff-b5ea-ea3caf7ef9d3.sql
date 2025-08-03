-- Fix RLS policies for alerts to allow system-triggered inserts

-- Drop existing restrictive policies for alerts
DROP POLICY IF EXISTS "Direction and chef_base can manage alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can view alerts in their base or all if direction" ON public.alerts;

-- Create more permissive policies for alerts that allow automatic inserts
CREATE POLICY "System can insert alerts"
ON public.alerts
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view alerts in their base"
ON public.alerts
FOR SELECT
USING (
  (get_user_role() = 'direction'::user_role) OR 
  (base_id = get_user_base_id()) OR 
  (base_id IS NULL)
);

CREATE POLICY "Direction and chef_base can manage alerts"
ON public.alerts
FOR ALL
USING (
  (get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role])) AND 
  ((get_user_role() = 'direction'::user_role) OR (base_id = get_user_base_id()) OR (base_id IS NULL))
)
WITH CHECK (
  (get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role])) AND 
  ((get_user_role() = 'direction'::user_role) OR (base_id = get_user_base_id()) OR (base_id IS NULL))
);