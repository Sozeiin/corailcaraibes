-- Create tables for check-in/check-out activities and enhanced planning

-- Create activity types enum
CREATE TYPE activity_type AS ENUM ('maintenance', 'checkin', 'checkout', 'travel', 'break', 'emergency');

-- Create activity status enum  
CREATE TYPE activity_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled', 'overdue');

-- Create planning activities table for unified activity management
CREATE TABLE public.planning_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_type activity_type NOT NULL DEFAULT 'maintenance',
  status activity_status NOT NULL DEFAULT 'planned',
  title TEXT NOT NULL,
  description TEXT,
  
  -- Scheduling
  scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
  estimated_duration INTEGER, -- in minutes
  
  -- Actual timing
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  actual_duration INTEGER, -- in minutes
  
  -- Assignments
  technician_id UUID REFERENCES auth.users(id),
  boat_id UUID REFERENCES public.boats(id),
  base_id UUID NOT NULL REFERENCES public.bases(id),
  
  -- Planning metadata
  planned_by UUID REFERENCES auth.users(id),
  priority TEXT DEFAULT 'medium',
  color_code TEXT DEFAULT '#3b82f6',
  
  -- Check-in/Check-out specific
  rental_id UUID, -- Reference to boat rental if applicable
  checklist_completed BOOLEAN DEFAULT false,
  
  -- Performance tracking
  delay_minutes INTEGER DEFAULT 0,
  performance_rating INTEGER CHECK (performance_rating >= 1 AND performance_rating <= 5),
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Foreign key to original intervention if this was migrated
  original_intervention_id UUID REFERENCES public.interventions(id)
);

-- Create indexes for better performance
CREATE INDEX idx_planning_activities_technician_date ON public.planning_activities(technician_id, scheduled_start);
CREATE INDEX idx_planning_activities_boat_date ON public.planning_activities(boat_id, scheduled_start);
CREATE INDEX idx_planning_activities_base_date ON public.planning_activities(base_id, scheduled_start);
CREATE INDEX idx_planning_activities_type_status ON public.planning_activities(activity_type, status);

-- Create time slot conflicts table to track scheduling conflicts
CREATE TABLE public.planning_conflicts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id_1 UUID NOT NULL REFERENCES public.planning_activities(id) ON DELETE CASCADE,
  activity_id_2 UUID NOT NULL REFERENCES public.planning_activities(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL, -- 'technician_overlap', 'boat_overlap', 'resource_conflict'
  severity TEXT NOT NULL DEFAULT 'warning', -- 'warning', 'error', 'critical'
  auto_detected BOOLEAN DEFAULT true,
  resolved BOOLEAN DEFAULT false,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(activity_id_1, activity_id_2)
);

-- Create planning templates for common activities
CREATE TABLE public.planning_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  activity_type activity_type NOT NULL,
  estimated_duration INTEGER NOT NULL, -- in minutes
  description TEXT,
  checklist_items JSONB DEFAULT '[]',
  default_priority TEXT DEFAULT 'medium',
  color_code TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN DEFAULT true,
  base_id UUID REFERENCES public.bases(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.planning_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for planning_activities
CREATE POLICY "Users can view activities for their base or if assigned"
ON public.planning_activities FOR SELECT
USING (
  get_user_role() = 'direction' 
  OR base_id = get_user_base_id() 
  OR technician_id = auth.uid()
);

CREATE POLICY "Direction and chef_base can manage activities"
ON public.planning_activities FOR ALL
USING (
  get_user_role() = ANY(ARRAY['direction', 'chef_base']) 
  AND (get_user_role() = 'direction' OR base_id = get_user_base_id())
);

CREATE POLICY "Technicians can update their assigned activities"
ON public.planning_activities FOR UPDATE
USING (technician_id = auth.uid())
WITH CHECK (technician_id = auth.uid());

-- RLS policies for planning_conflicts
CREATE POLICY "Users can view conflicts for their base"
ON public.planning_conflicts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.planning_activities pa
    WHERE (pa.id = planning_conflicts.activity_id_1 OR pa.id = planning_conflicts.activity_id_2)
    AND (get_user_role() = 'direction' OR pa.base_id = get_user_base_id())
  )
);

CREATE POLICY "Direction and chef_base can manage conflicts"
ON public.planning_conflicts FOR ALL
USING (
  get_user_role() = ANY(ARRAY['direction', 'chef_base'])
  AND EXISTS (
    SELECT 1 FROM public.planning_activities pa
    WHERE (pa.id = planning_conflicts.activity_id_1 OR pa.id = planning_conflicts.activity_id_2)
    AND (get_user_role() = 'direction' OR pa.base_id = get_user_base_id())
  )
);

-- RLS policies for planning_templates
CREATE POLICY "Users can view templates for their base"
ON public.planning_templates FOR SELECT
USING (
  get_user_role() = 'direction' 
  OR base_id = get_user_base_id() 
  OR base_id IS NULL
);

CREATE POLICY "Direction and chef_base can manage templates"
ON public.planning_templates FOR ALL
USING (
  get_user_role() = ANY(ARRAY['direction', 'chef_base'])
  AND (get_user_role() = 'direction' OR base_id = get_user_base_id() OR base_id IS NULL)
);

-- Create triggers for updated_at
CREATE TRIGGER update_planning_activities_updated_at
  BEFORE UPDATE ON public.planning_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_planning_templates_updated_at
  BEFORE UPDATE ON public.planning_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically detect conflicts
CREATE OR REPLACE FUNCTION public.detect_planning_conflicts()
RETURNS TRIGGER AS $$
BEGIN
  -- Clean up old conflicts for this activity
  DELETE FROM public.planning_conflicts 
  WHERE activity_id_1 = NEW.id OR activity_id_2 = NEW.id;
  
  -- Detect technician overlaps
  INSERT INTO public.planning_conflicts (activity_id_1, activity_id_2, conflict_type, severity)
  SELECT 
    NEW.id,
    pa.id,
    'technician_overlap',
    'warning'
  FROM public.planning_activities pa
  WHERE pa.id != NEW.id
    AND pa.technician_id = NEW.technician_id
    AND pa.technician_id IS NOT NULL
    AND pa.status != 'cancelled'
    AND (
      (NEW.scheduled_start < pa.scheduled_end AND NEW.scheduled_end > pa.scheduled_start)
    );
  
  -- Detect boat overlaps
  INSERT INTO public.planning_conflicts (activity_id_1, activity_id_2, conflict_type, severity)
  SELECT 
    NEW.id,
    pa.id,
    'boat_overlap',
    'error'
  FROM public.planning_activities pa
  WHERE pa.id != NEW.id
    AND pa.boat_id = NEW.boat_id
    AND pa.boat_id IS NOT NULL
    AND pa.status != 'cancelled'
    AND (
      (NEW.scheduled_start < pa.scheduled_end AND NEW.scheduled_end > pa.scheduled_start)
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for conflict detection
CREATE TRIGGER detect_conflicts_on_activity_change
  AFTER INSERT OR UPDATE ON public.planning_activities
  FOR EACH ROW EXECUTE FUNCTION public.detect_planning_conflicts();

-- Insert default templates
INSERT INTO public.planning_templates (name, activity_type, estimated_duration, description, color_code) VALUES
('Check-in Standard', 'checkin', 30, 'Check-in standard avec inspection complète', '#10b981'),
('Check-in Express', 'checkin', 15, 'Check-in rapide pour clients réguliers', '#059669'),
('Check-out Standard', 'checkout', 20, 'Check-out avec inspection des dommages', '#f59e0b'),
('Check-out Express', 'checkout', 10, 'Check-out rapide sans inspection approfondie', '#d97706'),
('Maintenance Préventive', 'maintenance', 120, 'Maintenance préventive planifiée', '#3b82f6'),
('Réparation d''Urgence', 'emergency', 60, 'Intervention d''urgence', '#ef4444'),
('Déplacement Inter-Base', 'travel', 45, 'Temps de trajet entre bases', '#6b7280'),
('Pause Déjeuner', 'break', 60, 'Pause déjeuner', '#8b5cf6');