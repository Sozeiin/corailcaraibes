-- Fix the trigger issue by making changed_by nullable in profile_audit_log
ALTER TABLE profile_audit_log ALTER COLUMN changed_by DROP NOT NULL;

-- Add the column for intervention permissions
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_complete_interventions BOOLEAN DEFAULT FALSE;

-- Update specific chef_base profiles to have intervention completion rights
-- This will trigger the log but with nullable changed_by it should work
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

-- Create function to check intervention completion permissions
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