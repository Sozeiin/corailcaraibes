-- Ajuster les politiques RLS pour les modèles de checklist
-- Permettre aux chefs de base de voir tous les modèles actifs ou créer des modèles globaux

-- Supprimer l'ancienne politique restrictive
DROP POLICY IF EXISTS "Users can view templates for their base" ON preparation_checklist_templates;

-- Créer une nouvelle politique plus permissive pour la visualisation
CREATE POLICY "Users can view preparation templates" 
ON preparation_checklist_templates 
FOR SELECT 
USING (
  get_user_role() = 'direction'::user_role 
  OR base_id = get_user_base_id() 
  OR base_id IS NULL
  OR get_user_role() = ANY(ARRAY['chef_base'::user_role, 'technicien'::user_role])
);

-- Ajuster la politique de gestion pour permettre aux chefs de base de créer des modèles globaux
DROP POLICY IF EXISTS "Direction and chef_base can manage templates" ON preparation_checklist_templates;

CREATE POLICY "Direction and chef_base can manage templates" 
ON preparation_checklist_templates 
FOR ALL 
USING (
  (get_user_role() = 'direction'::user_role) 
  OR (get_user_role() = 'chef_base'::user_role AND (base_id = get_user_base_id() OR base_id IS NULL))
) 
WITH CHECK (
  (get_user_role() = 'direction'::user_role) 
  OR (get_user_role() = 'chef_base'::user_role AND (base_id = get_user_base_id() OR base_id IS NULL))
);