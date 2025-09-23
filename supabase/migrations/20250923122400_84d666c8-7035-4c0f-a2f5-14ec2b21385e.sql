-- Supprimer toutes les politiques existantes pour les modèles de checklist
DROP POLICY IF EXISTS "Users can view preparation templates" ON preparation_checklist_templates;
DROP POLICY IF EXISTS "Users can view templates for their base" ON preparation_checklist_templates;
DROP POLICY IF EXISTS "Direction and chef_base can manage templates" ON preparation_checklist_templates;

-- Créer une nouvelle politique permissive pour la visualisation
CREATE POLICY "All authenticated users can view templates" 
ON preparation_checklist_templates 
FOR SELECT 
USING (true);

-- Créer une politique pour la gestion
CREATE POLICY "Direction and chef_base can manage all templates" 
ON preparation_checklist_templates 
FOR ALL 
USING (get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role]))
WITH CHECK (get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role]));