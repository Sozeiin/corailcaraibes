-- Add completed_at timestamp column to interventions table
ALTER TABLE public.interventions 
ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;