-- Add component_id column to interventions table for better component-intervention linking
ALTER TABLE public.interventions 
ADD COLUMN component_id UUID REFERENCES public.boat_components(id);

-- Create index on component_id for better query performance
CREATE INDEX idx_interventions_component_id ON public.interventions(component_id);

-- Create index on boat_id for better query performance if not exists
CREATE INDEX IF NOT EXISTS idx_interventions_boat_id ON public.interventions(boat_id);

-- Add comment for documentation
COMMENT ON COLUMN public.interventions.component_id IS 'Reference to the specific component if the intervention is component-specific';