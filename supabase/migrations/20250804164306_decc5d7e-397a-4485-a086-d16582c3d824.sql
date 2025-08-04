-- Create boat_components table
CREATE TABLE public.boat_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boat_id UUID NOT NULL REFERENCES public.boats(id) ON DELETE CASCADE,
  component_name TEXT NOT NULL,
  component_type TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  installation_date DATE,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  maintenance_interval_days INTEGER DEFAULT 365,
  status TEXT DEFAULT 'operational',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add component_id to intervention_parts table
ALTER TABLE public.intervention_parts 
ADD COLUMN component_id UUID REFERENCES public.boat_components(id) ON DELETE SET NULL;

-- Enable RLS on boat_components
ALTER TABLE public.boat_components ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for boat_components
CREATE POLICY "Users can view boat components for their base" 
ON public.boat_components 
FOR SELECT 
USING (
  get_user_role() = 'direction' OR 
  EXISTS (
    SELECT 1 FROM boats b 
    WHERE b.id = boat_components.boat_id 
    AND b.base_id = get_user_base_id()
  )
);

CREATE POLICY "Direction and chef_base can manage boat components" 
ON public.boat_components 
FOR ALL 
USING (
  get_user_role() = ANY(ARRAY['direction', 'chef_base']) AND 
  (get_user_role() = 'direction' OR 
   EXISTS (
     SELECT 1 FROM boats b 
     WHERE b.id = boat_components.boat_id 
     AND b.base_id = get_user_base_id()
   ))
);

-- Add trigger for updated_at
CREATE TRIGGER update_boat_components_updated_at
BEFORE UPDATE ON public.boat_components
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();