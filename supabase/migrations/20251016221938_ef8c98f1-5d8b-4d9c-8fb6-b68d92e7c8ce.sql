-- Étape 1 : Supprimer la politique dupliquée sur planning_activities
DROP POLICY IF EXISTS "Direction and chef_base can manage activities" ON public.planning_activities;

-- Étape 2 : Mettre à jour la politique maintenance_manual_tasks
DROP POLICY IF EXISTS "Direction and chef_base can manage manual tasks" ON public.maintenance_manual_tasks;

CREATE POLICY "Direction, chef_base and administratif can manage manual tasks"
ON public.maintenance_manual_tasks
FOR ALL
TO public
USING (
  (get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role, 'administratif'::user_role]))
  AND (
    (get_user_role() = 'direction'::user_role) 
    OR (EXISTS ( SELECT 1
       FROM (maintenance_manuals mm
         LEFT JOIN boats b ON ((b.id = mm.boat_id)))
      WHERE ((mm.id = maintenance_manual_tasks.manual_id) AND (b.base_id = get_user_base_id() OR mm.boat_id IS NULL))))
  )
);

-- Étape 3 : Mettre à jour la politique scheduled_maintenance
DROP POLICY IF EXISTS "Direction and chef_base can manage scheduled maintenance" ON public.scheduled_maintenance;

CREATE POLICY "Direction, chef_base and administratif can manage scheduled maintenance"
ON public.scheduled_maintenance
FOR ALL
TO public
USING (
  (get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role, 'administratif'::user_role]))
  AND (
    (get_user_role() = 'direction'::user_role) 
    OR (EXISTS ( SELECT 1
       FROM boats b
      WHERE ((b.id = scheduled_maintenance.boat_id) AND (b.base_id = get_user_base_id()))))
  )
);