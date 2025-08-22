-- Update RLS policy on boat_components to allow technicians
DROP POLICY IF EXISTS "Direction and chef_base can manage boat components" ON public.boat_components;

CREATE POLICY "Direction, chef_base and technicians can manage boat components" 
ON public.boat_components 
FOR ALL 
USING (
  (get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role, 'technicien'::user_role])) 
  AND (
    (get_user_role() = 'direction'::user_role) 
    OR (EXISTS ( 
      SELECT 1
      FROM boats b
      WHERE b.id = boat_components.boat_id 
      AND b.base_id = get_user_base_id()
    ))
  )
);