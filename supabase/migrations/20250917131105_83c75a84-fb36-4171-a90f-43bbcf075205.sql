-- Add 'preparation' to activity_type enum
ALTER TYPE activity_type ADD VALUE 'preparation';

-- Create preparation checklist templates table
CREATE TABLE public.preparation_checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  boat_model TEXT,
  category TEXT DEFAULT 'standard',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  base_id UUID REFERENCES public.bases(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create boat preparation checklists table
CREATE TABLE public.boat_preparation_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_activity_id UUID REFERENCES public.planning_activities(id) ON DELETE CASCADE,
  boat_id UUID REFERENCES public.boats(id) NOT NULL,
  template_id UUID REFERENCES public.preparation_checklist_templates(id),
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'ready', 'anomaly')),
  technician_id UUID REFERENCES auth.users(id),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  completion_date TIMESTAMP WITH TIME ZONE,
  anomalies_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create preparation anomalies table
CREATE TABLE public.preparation_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preparation_id UUID REFERENCES public.boat_preparation_checklists(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT NOT NULL,
  photo_url TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  auto_maintenance_created BOOLEAN DEFAULT false,
  intervention_id UUID REFERENCES public.interventions(id),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.preparation_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boat_preparation_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preparation_anomalies ENABLE ROW LEVEL SECURITY;

-- RLS policies for preparation_checklist_templates
CREATE POLICY "Direction and chef_base can manage templates" ON public.preparation_checklist_templates
  FOR ALL USING (
    get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role]) AND
    (get_user_role() = 'direction' OR base_id = get_user_base_id() OR base_id IS NULL)
  );

CREATE POLICY "Users can view templates for their base" ON public.preparation_checklist_templates
  FOR SELECT USING (
    get_user_role() = 'direction' OR base_id = get_user_base_id() OR base_id IS NULL
  );

-- RLS policies for boat_preparation_checklists
CREATE POLICY "Direction and chef_base can manage preparation checklists" ON public.boat_preparation_checklists
  FOR ALL USING (
    get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role]) AND
    (get_user_role() = 'direction' OR EXISTS (
      SELECT 1 FROM boats b WHERE b.id = boat_preparation_checklists.boat_id AND b.base_id = get_user_base_id()
    ))
  );

CREATE POLICY "Technicians can view and update their assigned preparation checklists" ON public.boat_preparation_checklists
  FOR ALL USING (
    technician_id = auth.uid() OR
    get_user_role() = 'direction' OR
    EXISTS (
      SELECT 1 FROM boats b WHERE b.id = boat_preparation_checklists.boat_id AND b.base_id = get_user_base_id()
    )
  );

-- RLS policies for preparation_anomalies
CREATE POLICY "Users can manage anomalies for their base preparations" ON public.preparation_anomalies
  FOR ALL USING (
    get_user_role() = 'direction' OR EXISTS (
      SELECT 1 FROM boat_preparation_checklists bpc
      JOIN boats b ON b.id = bpc.boat_id
      WHERE bpc.id = preparation_anomalies.preparation_id AND b.base_id = get_user_base_id()
    )
  );

-- Add triggers for updated_at
CREATE TRIGGER update_preparation_checklist_templates_updated_at
  BEFORE UPDATE ON public.preparation_checklist_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_boat_preparation_checklists_updated_at
  BEFORE UPDATE ON public.boat_preparation_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically update anomalies count
CREATE OR REPLACE FUNCTION update_preparation_anomalies_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.boat_preparation_checklists 
    SET anomalies_count = anomalies_count + 1
    WHERE id = NEW.preparation_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.boat_preparation_checklists 
    SET anomalies_count = anomalies_count - 1
    WHERE id = OLD.preparation_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_anomalies_count_trigger
  AFTER INSERT OR DELETE ON public.preparation_anomalies
  FOR EACH ROW EXECUTE FUNCTION update_preparation_anomalies_count();