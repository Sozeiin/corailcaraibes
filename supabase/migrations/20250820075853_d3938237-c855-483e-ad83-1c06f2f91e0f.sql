-- Phase 1: Correction des politiques RLS pour la suppression des fournisseurs

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Direction and chef_base can manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can view suppliers in their base or all if direction" ON public.suppliers;

-- Créer des politiques séparées et claires
CREATE POLICY "Direction can manage all suppliers" 
ON public.suppliers 
FOR ALL 
USING (get_user_role() = 'direction'::user_role);

CREATE POLICY "Chef_base can manage suppliers in their base" 
ON public.suppliers 
FOR ALL 
USING (
  get_user_role() = 'chef_base'::user_role 
  AND (base_id = get_user_base_id() OR base_id IS NULL)
);

CREATE POLICY "Users can view suppliers" 
ON public.suppliers 
FOR SELECT 
USING (
  get_user_role() = 'direction'::user_role 
  OR base_id = get_user_base_id() 
  OR base_id IS NULL
);