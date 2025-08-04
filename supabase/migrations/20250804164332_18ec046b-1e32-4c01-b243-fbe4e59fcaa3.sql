-- Add component_id to intervention_parts table
ALTER TABLE public.intervention_parts 
ADD COLUMN component_id UUID REFERENCES public.boat_components(id) ON DELETE SET NULL;