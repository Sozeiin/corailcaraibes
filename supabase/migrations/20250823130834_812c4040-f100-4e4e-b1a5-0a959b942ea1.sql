-- Add missing columns to interventions table
ALTER TABLE public.interventions 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';

-- Update RLS policies to include the new columns
CREATE POLICY "Users can create interventions in their base" 
ON public.interventions 
FOR INSERT 
WITH CHECK (
  (get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role, 'technicien'::user_role])) 
  AND (base_id = get_user_base_id())
);

-- Ensure existing policies handle the new columns properly
DROP POLICY IF EXISTS "Direction and chef_base can manage interventions" ON public.interventions;
CREATE POLICY "Direction and chef_base can manage interventions" 
ON public.interventions 
FOR ALL 
USING (
  (get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role])) 
  AND ((get_user_role() = 'direction'::user_role) OR (base_id = get_user_base_id()))
);

-- Update the view policy to include created_by access
DROP POLICY IF EXISTS "Users can view interventions for their base or assigned to them" ON public.interventions;
CREATE POLICY "Users can view interventions for their base or assigned to them" 
ON public.interventions 
FOR SELECT 
USING (
  (get_user_role() = 'direction'::user_role) 
  OR (base_id = get_user_base_id()) 
  OR (technician_id = auth.uid())
  OR (created_by = auth.uid())
);