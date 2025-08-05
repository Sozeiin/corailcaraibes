-- Add scheduled_time column to interventions table for Gantt scheduling
ALTER TABLE public.interventions 
ADD COLUMN scheduled_time TIME DEFAULT '09:00:00';

-- Add index for better query performance on scheduled_time
CREATE INDEX idx_interventions_scheduled_time ON public.interventions(scheduled_time);

-- Add comment for documentation
COMMENT ON COLUMN public.interventions.scheduled_time IS 'Time of day when the intervention is scheduled (used for Gantt view)';