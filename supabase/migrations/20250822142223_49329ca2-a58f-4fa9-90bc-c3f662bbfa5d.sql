-- Add notes column to interventions table
ALTER TABLE public.interventions 
ADD COLUMN notes TEXT;