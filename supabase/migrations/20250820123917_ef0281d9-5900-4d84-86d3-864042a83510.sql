-- Mettre à jour les politiques RLS pour permettre aux techniciens de modifier le stock via le scanner
DROP POLICY IF EXISTS "Direction and chef_base can manage stock" ON public.stock_items;
DROP POLICY IF EXISTS "Users can view stock in their base or all if direction" ON public.stock_items;

-- Nouvelle politique pour la lecture (inchangée)
CREATE POLICY "Users can view stock in their base or all if direction" 
ON public.stock_items 
FOR SELECT 
USING (
  (get_user_role() = 'direction'::user_role) 
  OR (base_id = get_user_base_id())
);

-- Nouvelle politique pour permettre à tous les utilisateurs authentifiés de modifier le stock de leur base
CREATE POLICY "Users can manage stock in their base" 
ON public.stock_items 
FOR ALL 
USING (
  (get_user_role() = 'direction'::user_role) 
  OR (base_id = get_user_base_id())
)
WITH CHECK (
  (get_user_role() = 'direction'::user_role) 
  OR (base_id = get_user_base_id())
);