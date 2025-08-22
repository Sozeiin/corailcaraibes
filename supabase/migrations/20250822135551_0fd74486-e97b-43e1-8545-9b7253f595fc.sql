-- Add separate engine hours for starboard and port engines
ALTER TABLE public.interventions 
ADD COLUMN engine_hours_start_starboard NUMERIC,
ADD COLUMN engine_hours_end_starboard NUMERIC,
ADD COLUMN engine_hours_start_port NUMERIC,
ADD COLUMN engine_hours_end_port NUMERIC;

-- Add separate engine hours tracking for boats
ALTER TABLE public.boats 
ADD COLUMN current_engine_hours_starboard INTEGER DEFAULT 0,
ADD COLUMN current_engine_hours_port INTEGER DEFAULT 0,
ADD COLUMN last_oil_change_hours_starboard INTEGER DEFAULT 0,
ADD COLUMN last_oil_change_hours_port INTEGER DEFAULT 0;

-- Update the trigger function to handle separate engines
CREATE OR REPLACE FUNCTION public.update_boat_engine_hours()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update boat engine hours and oil change hours when intervention is completed
  IF NEW.status = 'completed' THEN
    -- Update starboard engine if hours provided
    IF NEW.engine_hours_end_starboard IS NOT NULL THEN
      UPDATE public.boats
      SET 
        current_engine_hours_starboard = NEW.engine_hours_end_starboard,
        last_engine_hours_update = now(),
        last_oil_change_hours_starboard = CASE 
          WHEN NEW.is_oil_change = true THEN NEW.engine_hours_end_starboard
          ELSE last_oil_change_hours_starboard
        END
      WHERE id = NEW.boat_id;
    END IF;
    
    -- Update port engine if hours provided
    IF NEW.engine_hours_end_port IS NOT NULL THEN
      UPDATE public.boats
      SET 
        current_engine_hours_port = NEW.engine_hours_end_port,
        last_engine_hours_update = now(),
        last_oil_change_hours_port = CASE 
          WHEN NEW.is_oil_change = true THEN NEW.engine_hours_end_port
          ELSE last_oil_change_hours_port
        END
      WHERE id = NEW.boat_id;
    END IF;

    -- Update legacy fields for backward compatibility (use average or max)
    IF NEW.engine_hours_end IS NOT NULL THEN
      UPDATE public.boats
      SET 
        current_engine_hours = NEW.engine_hours_end,
        last_engine_hours_update = now(),
        last_oil_change_hours = CASE 
          WHEN NEW.is_oil_change = true THEN NEW.engine_hours_end
          ELSE last_oil_change_hours
        END
      WHERE id = NEW.boat_id;
    ELSIF NEW.engine_hours_end_starboard IS NOT NULL AND NEW.engine_hours_end_port IS NOT NULL THEN
      -- Use the maximum of both engines for legacy compatibility
      UPDATE public.boats
      SET 
        current_engine_hours = GREATEST(NEW.engine_hours_end_starboard, NEW.engine_hours_end_port),
        last_engine_hours_update = now(),
        last_oil_change_hours = CASE 
          WHEN NEW.is_oil_change = true THEN GREATEST(NEW.engine_hours_end_starboard, NEW.engine_hours_end_port)
          ELSE last_oil_change_hours
        END
      WHERE id = NEW.boat_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;