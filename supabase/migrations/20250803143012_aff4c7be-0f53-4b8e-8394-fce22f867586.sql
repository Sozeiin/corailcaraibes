-- Add intervention_type field to interventions table
ALTER TABLE public.interventions 
ADD COLUMN intervention_type TEXT DEFAULT 'maintenance' 
CHECK (intervention_type IN ('preventive', 'corrective', 'emergency', 'inspection', 'repair', 'maintenance'));

-- Add index for better performance
CREATE INDEX idx_interventions_type ON public.interventions(intervention_type);

-- Update existing interventions to have a default type
UPDATE public.interventions 
SET intervention_type = 'maintenance' 
WHERE intervention_type IS NULL;