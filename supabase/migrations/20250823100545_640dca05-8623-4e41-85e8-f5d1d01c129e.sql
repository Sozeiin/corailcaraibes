-- Update RLS policies to allow chef_base profiles from Guadeloupe and Martinique to complete interventions
UPDATE profiles 
SET role = 'direction' 
WHERE role = 'chef_base' 
AND base_id IN (
  SELECT id FROM bases 
  WHERE LOWER(name) LIKE '%guadeloupe%' 
  OR LOWER(name) LIKE '%martinique%'
  OR LOWER(location) LIKE '%guadeloupe%' 
  OR LOWER(location) LIKE '%martinique%'
);

-- Create a function to check if user can complete interventions (including specific chef_base)
CREATE OR REPLACE FUNCTION public.can_complete_interventions()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN get_user_role() = 'direction' THEN true
    WHEN get_user_role() = 'technicien' THEN true
    WHEN get_user_role() = 'chef_base' AND EXISTS (
      SELECT 1 FROM profiles p 
      JOIN bases b ON b.id = p.base_id 
      WHERE p.id = auth.uid()
      AND (
        LOWER(b.name) LIKE '%guadeloupe%' 
        OR LOWER(b.name) LIKE '%martinique%'
        OR LOWER(b.location) LIKE '%guadeloupe%' 
        OR LOWER(b.location) LIKE '%martinique%'
      )
    ) THEN true
    ELSE false
  END;
$$;

-- Update intervention RLS policies to use the new function
DROP POLICY IF EXISTS "Technicians can complete their assigned interventions" ON interventions;
DROP POLICY IF EXISTS "Direction and chef_base can manage interventions" ON interventions;

CREATE POLICY "Users who can complete interventions can manage them"
ON interventions
FOR ALL
USING (
  can_complete_interventions() 
  OR (get_user_role() = 'direction')
  OR (base_id = get_user_base_id())
  OR (technician_id = auth.uid())
)
WITH CHECK (
  can_complete_interventions() 
  OR (get_user_role() = 'direction')
  OR (base_id = get_user_base_id())
);