-- Créer une table pour les manuels de maintenance
CREATE TABLE public.maintenance_manuals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  boat_id UUID REFERENCES public.boats(id) ON DELETE CASCADE,
  boat_model TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Créer une table pour les tâches de maintenance prédéfinies dans les manuels
CREATE TABLE public.maintenance_manual_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manual_id UUID NOT NULL REFERENCES public.maintenance_manuals(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  interval_value INTEGER NOT NULL,
  interval_unit TEXT NOT NULL CHECK (interval_unit IN ('heures', 'jours', 'semaines', 'mois', 'années')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer une table pour planifier automatiquement les maintenances
CREATE TABLE public.scheduled_maintenance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  boat_id UUID NOT NULL REFERENCES public.boats(id) ON DELETE CASCADE,
  manual_task_id UUID NOT NULL REFERENCES public.maintenance_manual_tasks(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')),
  intervention_id UUID REFERENCES public.interventions(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS sur toutes les tables
ALTER TABLE public.maintenance_manuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_manual_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_maintenance ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour maintenance_manuals
CREATE POLICY "Users can view manuals for their base or all if direction" 
ON public.maintenance_manuals 
FOR SELECT 
USING (
  get_user_role()::TEXT = 'direction' OR 
  EXISTS (SELECT 1 FROM boats b WHERE b.id = boat_id AND b.base_id = get_user_base_id()) OR
  boat_id IS NULL
);

CREATE POLICY "Direction and chef_base can manage manuals" 
ON public.maintenance_manuals 
FOR ALL 
USING (
  get_user_role()::TEXT IN ('direction', 'chef_base') AND
  (get_user_role()::TEXT = 'direction' OR 
   EXISTS (SELECT 1 FROM boats b WHERE b.id = boat_id AND b.base_id = get_user_base_id()) OR
   boat_id IS NULL)
);

-- Politiques RLS pour maintenance_manual_tasks
CREATE POLICY "Users can view manual tasks for their base" 
ON public.maintenance_manual_tasks 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM maintenance_manuals mm 
    LEFT JOIN boats b ON b.id = mm.boat_id
    WHERE mm.id = manual_id AND 
    (get_user_role()::TEXT = 'direction' OR b.base_id = get_user_base_id() OR mm.boat_id IS NULL)
  )
);

CREATE POLICY "Direction and chef_base can manage manual tasks" 
ON public.maintenance_manual_tasks 
FOR ALL 
USING (
  get_user_role()::TEXT IN ('direction', 'chef_base') AND
  EXISTS (
    SELECT 1 FROM maintenance_manuals mm 
    LEFT JOIN boats b ON b.id = mm.boat_id
    WHERE mm.id = manual_id AND 
    (get_user_role()::TEXT = 'direction' OR b.base_id = get_user_base_id() OR mm.boat_id IS NULL)
  )
);

-- Politiques RLS pour scheduled_maintenance
CREATE POLICY "Users can view scheduled maintenance for their base" 
ON public.scheduled_maintenance 
FOR SELECT 
USING (
  get_user_role()::TEXT = 'direction' OR 
  EXISTS (SELECT 1 FROM boats b WHERE b.id = boat_id AND b.base_id = get_user_base_id())
);

CREATE POLICY "Direction and chef_base can manage scheduled maintenance" 
ON public.scheduled_maintenance 
FOR ALL 
USING (
  get_user_role()::TEXT IN ('direction', 'chef_base') AND
  (get_user_role()::TEXT = 'direction' OR 
   EXISTS (SELECT 1 FROM boats b WHERE b.id = boat_id AND b.base_id = get_user_base_id()))
);

-- Trigger pour update_updated_at sur maintenance_manuals
CREATE TRIGGER update_maintenance_manuals_updated_at
BEFORE UPDATE ON public.maintenance_manuals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger pour update_updated_at sur scheduled_maintenance  
CREATE TRIGGER update_scheduled_maintenance_updated_at
BEFORE UPDATE ON public.scheduled_maintenance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();