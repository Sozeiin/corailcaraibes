-- Add validation trigger for engine hours
-- This ensures data integrity at the database level

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS validate_engine_hours_trigger ON boat_components;
DROP FUNCTION IF EXISTS validate_engine_hours();

-- Create validation function
CREATE OR REPLACE FUNCTION validate_engine_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validation: heures >= 0
  IF NEW.current_engine_hours < 0 THEN
    RAISE EXCEPTION 'Les heures moteur ne peuvent pas être négatives';
  END IF;
  
  IF NEW.last_oil_change_hours < 0 THEN
    RAISE EXCEPTION 'Les heures de dernière vidange ne peuvent pas être négatives';
  END IF;
  
  -- Validation: last_oil_change <= current_engine_hours
  IF NEW.last_oil_change_hours > NEW.current_engine_hours THEN
    RAISE EXCEPTION 'Les heures de dernière vidange ne peuvent pas être supérieures aux heures actuelles';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on boat_components
CREATE TRIGGER validate_engine_hours_trigger
  BEFORE INSERT OR UPDATE OF current_engine_hours, last_oil_change_hours
  ON boat_components
  FOR EACH ROW
  EXECUTE FUNCTION validate_engine_hours();

-- Log security enhancement
INSERT INTO public.security_events (
  event_type,
  user_id,
  details
) VALUES (
  'security_enhancement',
  NULL,
  jsonb_build_object(
    'feature', 'engine_hours_validation',
    'description', 'Added validation trigger for engine hours to prevent data inconsistencies',
    'validations', jsonb_build_array(
      'Engine hours must be >= 0',
      'Oil change hours must be >= 0',
      'Oil change hours must be <= current engine hours'
    ),
    'timestamp', now()
  )
);