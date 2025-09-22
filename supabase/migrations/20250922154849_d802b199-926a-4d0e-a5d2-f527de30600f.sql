-- Migration pour permettre aux chefs de base de voir tous les stocks en lecture seule

-- Supprimer les anciennes politiques de lecture
DROP POLICY IF EXISTS "Chef_base can view stock items in their base" ON public.stock_items;
DROP POLICY IF EXISTS "Technicians can view stock items in their base" ON public.stock_items;
DROP POLICY IF EXISTS "Users can view stock items" ON public.stock_items;
DROP POLICY IF EXISTS "Users can view stock in their base" ON public.stock_items;

-- Créer une nouvelle politique de lecture pour tous les stocks (chefs de base et direction)
CREATE POLICY "Chef_base and direction can view all stocks"
ON public.stock_items
FOR SELECT
TO authenticated
USING (
  get_user_role() = 'direction'::user_role 
  OR get_user_role() = 'chef_base'::user_role
);

-- Créer une politique de lecture pour les techniciens (seulement leur base)
CREATE POLICY "Technicians can view stock in their base"
ON public.stock_items
FOR SELECT
TO authenticated
USING (
  get_user_role() = 'technicien'::user_role 
  AND base_id = get_user_base_id()
);

-- Modifier les politiques d'écriture pour maintenir les restrictions par base
-- Supprimer l'ancienne politique de gestion
DROP POLICY IF EXISTS "Chef_base can manage stock items in their base" ON public.stock_items;
DROP POLICY IF EXISTS "Users can manage stock items" ON public.stock_items;

-- Créer une nouvelle politique pour les opérations d'écriture (INSERT, UPDATE, DELETE)
-- Direction peut tout gérer
CREATE POLICY "Direction can manage all stock items"
ON public.stock_items
FOR ALL
TO authenticated
USING (get_user_role() = 'direction'::user_role)
WITH CHECK (get_user_role() = 'direction'::user_role);

-- Chef de base peut gérer seulement les articles de sa base
CREATE POLICY "Chef_base can manage stock in their base"
ON public.stock_items
FOR ALL
TO authenticated
USING (
  get_user_role() = 'chef_base'::user_role 
  AND base_id = get_user_base_id()
)
WITH CHECK (
  get_user_role() = 'chef_base'::user_role 
  AND base_id = get_user_base_id()
);

-- Techniciens peuvent gérer les articles de leur base (si nécessaire)
CREATE POLICY "Technicians can manage stock in their base"
ON public.stock_items
FOR ALL
TO authenticated
USING (
  get_user_role() = 'technicien'::user_role 
  AND base_id = get_user_base_id()
)
WITH CHECK (
  get_user_role() = 'technicien'::user_role 
  AND base_id = get_user_base_id()
);