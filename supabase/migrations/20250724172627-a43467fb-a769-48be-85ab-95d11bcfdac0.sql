-- Mettre à jour les policies RLS pour permettre aux chefs de base d'ajouter des devis
DROP POLICY IF EXISTS "Chef de base can view supplier quotes" ON public.supplier_quotes;
DROP POLICY IF EXISTS "Direction can manage supplier quotes" ON public.supplier_quotes;

-- Nouvelle policy pour permettre aux chefs de base et à la direction de voir les devis
CREATE POLICY "Chef de base et direction can view supplier quotes" 
ON public.supplier_quotes 
FOR SELECT 
USING (get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role]));

-- Nouvelle policy pour permettre aux chefs de base et à la direction de gérer les devis
CREATE POLICY "Chef de base et direction can manage supplier quotes" 
ON public.supplier_quotes 
FOR ALL 
USING (get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role]))
WITH CHECK (get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role]));

-- Corriger également les policies pour les analyses de devis
DROP POLICY IF EXISTS "Chef de base can view quote analysis" ON public.quote_analysis;
DROP POLICY IF EXISTS "Direction can manage quote analysis" ON public.quote_analysis;

CREATE POLICY "Chef de base et direction can view quote analysis" 
ON public.quote_analysis 
FOR SELECT 
USING (get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role]));

CREATE POLICY "Chef de base et direction can manage quote analysis" 
ON public.quote_analysis 
FOR ALL 
USING (get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role]))
WITH CHECK (get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role]));