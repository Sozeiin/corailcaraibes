-- Modify preparation_checklist_templates to use boat_id instead of boat_model
ALTER TABLE public.preparation_checklist_templates 
ADD COLUMN boat_id UUID REFERENCES public.boats(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX idx_preparation_checklist_templates_boat_id ON public.preparation_checklist_templates(boat_id);

-- For existing templates with boat_model, we'll make them global (boat_id = NULL)
-- The boat_model column will be dropped after migration
-- UPDATE: We'll keep the boat_model column for now to avoid data loss during transition

-- Update RLS policies to account for boat relationship
DROP POLICY IF EXISTS "All authenticated users can view templates" ON public.preparation_checklist_templates;
DROP POLICY IF EXISTS "Direction and chef_base can manage all templates" ON public.preparation_checklist_templates;

-- New RLS policies
CREATE POLICY "Users can view templates for their base boats or global templates"
ON public.preparation_checklist_templates
FOR SELECT
USING (
  boat_id IS NULL OR -- Global templates
  EXISTS (
    SELECT 1 FROM boats b 
    WHERE b.id = preparation_checklist_templates.boat_id 
    AND (get_user_role() = 'direction' OR b.base_id = get_user_base_id())
  )
);

CREATE POLICY "Direction and chef_base can manage templates"
ON public.preparation_checklist_templates
FOR ALL
USING (
  get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role]) AND
  (
    boat_id IS NULL OR -- Global templates
    get_user_role() = 'direction' OR -- Direction can manage all
    EXISTS (
      SELECT 1 FROM boats b 
      WHERE b.id = preparation_checklist_templates.boat_id 
      AND b.base_id = get_user_base_id()
    )
  )
)
WITH CHECK (
  get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role]) AND
  (
    boat_id IS NULL OR -- Global templates
    get_user_role() = 'direction' OR -- Direction can manage all
    EXISTS (
      SELECT 1 FROM boats b 
      WHERE b.id = preparation_checklist_templates.boat_id 
      AND b.base_id = get_user_base_id()
    )
  )
);