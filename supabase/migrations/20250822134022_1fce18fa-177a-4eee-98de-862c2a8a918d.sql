-- Add engine hours tracking to boats table
ALTER TABLE public.boats 
ADD COLUMN current_engine_hours integer DEFAULT 0,
ADD COLUMN last_engine_hours_update timestamp with time zone DEFAULT now(),
ADD COLUMN last_oil_change_hours integer DEFAULT 0;

-- Add engine hours tracking to interventions table
ALTER TABLE public.interventions 
ADD COLUMN engine_hours_start integer,
ADD COLUMN engine_hours_end integer,
ADD COLUMN is_oil_change boolean DEFAULT false;

-- Create function to calculate oil change status
CREATE OR REPLACE FUNCTION public.calculate_oil_change_status(current_hours integer, last_change_hours integer)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  DECLARE
    hours_since_change integer;
  BEGIN
    hours_since_change := current_hours - last_change_hours;
    
    IF hours_since_change >= 250 THEN
      RETURN 'overdue';
    ELSIF hours_since_change >= 200 THEN
      RETURN 'due_soon';
    ELSE
      RETURN 'ok';
    END IF;
  END;
END;
$$;

-- Create trigger to update boat engine hours when intervention is completed
CREATE OR REPLACE FUNCTION public.update_boat_engine_hours()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update boat engine hours and oil change hours when intervention is completed
  IF NEW.status = 'completed' AND NEW.engine_hours_end IS NOT NULL THEN
    UPDATE public.boats
    SET 
      current_engine_hours = NEW.engine_hours_end,
      last_engine_hours_update = now(),
      last_oil_change_hours = CASE 
        WHEN NEW.is_oil_change = true THEN NEW.engine_hours_end
        ELSE last_oil_change_hours
      END
    WHERE id = NEW.boat_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER update_boat_engine_hours_trigger
  AFTER UPDATE ON public.interventions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_boat_engine_hours();