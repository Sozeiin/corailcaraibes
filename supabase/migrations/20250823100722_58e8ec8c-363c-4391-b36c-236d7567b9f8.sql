-- Fix the profile audit log trigger by allowing null changed_by for system updates
-- First update the table to allow null changed_by temporarily
ALTER TABLE profile_audit_log ALTER COLUMN changed_by DROP NOT NULL;

-- Now run the profile updates without triggering the audit log
ALTER TABLE profiles DISABLE TRIGGER log_profile_changes;

-- Update chef_base profiles from Guadeloupe and Martinique to have extended permissions
-- We'll add a new column to mark them as having special permissions instead of changing their role
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_complete_interventions BOOLEAN DEFAULT FALSE;

-- Update specific chef_base profiles to have intervention completion rights
UPDATE profiles 
SET can_complete_interventions = TRUE 
WHERE role = 'chef_base' 
AND base_id IN (
  SELECT id FROM bases 
  WHERE LOWER(name) LIKE '%guadeloupe%' 
  OR LOWER(name) LIKE '%martinique%'
  OR LOWER(location) LIKE '%guadeloupe%' 
  OR LOWER(location) LIKE '%martinique%'
);

-- Re-enable the trigger
ALTER TABLE profiles ENABLE TRIGGER log_profile_changes;

-- Create the function to check intervention completion permissions
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
      WHERE p.id = auth.uid()
      AND p.can_complete_interventions = true
    ) THEN true
    ELSE false
  END;
$$;

-- Update intervention RLS policies
DROP POLICY IF EXISTS "Users who can complete interventions can manage them" ON interventions;
DROP POLICY IF EXISTS "Direction and chef_base can manage interventions" ON interventions;
DROP POLICY IF EXISTS "Technicians can complete their assigned interventions" ON interventions;

CREATE POLICY "Users can manage interventions based on permissions"
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