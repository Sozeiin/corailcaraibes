-- Add engine hours columns to boat_components
ALTER TABLE public.boat_components 
ADD COLUMN current_engine_hours INTEGER DEFAULT 0,
ADD COLUMN last_oil_change_hours INTEGER DEFAULT 0;

-- Update trigger to handle component engine hours instead of boat level
CREATE OR REPLACE FUNCTION public.update_component_engine_hours()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update component engine hours when intervention is completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update engine components with new hours and oil change status
    -- This will be handled by the application code directly
    -- The trigger is kept for future extensibility
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Add comment to clarify the new approach
COMMENT ON COLUMN public.boat_components.current_engine_hours IS 'Current total operating hours for engine components';
COMMENT ON COLUMN public.boat_components.last_oil_change_hours IS 'Engine hours when last oil change was performed';

-- Create index for better performance on engine hour queries
CREATE INDEX IF NOT EXISTS idx_boat_components_engine_hours ON public.boat_components(current_engine_hours, last_oil_change_hours) WHERE component_type ILIKE '%moteur%';