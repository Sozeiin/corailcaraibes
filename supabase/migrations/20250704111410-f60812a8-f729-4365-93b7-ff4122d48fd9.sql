-- Créer une politique pour permettre aux chefs de base et direction de voir les profils
CREATE POLICY "Chef de base and direction can view profiles in their base"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Direction peut voir tous les profils
  get_user_role() = 'direction'::user_role 
  OR 
  -- Chef de base peut voir les profils de sa base
  (get_user_role() = 'chef_base'::user_role AND base_id = get_user_base_id())
);