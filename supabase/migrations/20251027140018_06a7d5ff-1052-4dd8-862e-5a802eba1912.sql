-- First, drop the problematic trigger if it exists
DROP TRIGGER IF EXISTS activate_one_way_sharing_trigger ON administrative_checkin_forms;
DROP FUNCTION IF EXISTS activate_one_way_sharing() CASCADE;

-- Recreate the function with proper logic (no ON CONFLICT)
CREATE OR REPLACE FUNCTION activate_one_way_sharing()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if this is a ONE WAY rental with a destination base
  IF NEW.is_one_way = true AND NEW.destination_base_id IS NOT NULL AND NEW.boat_id IS NOT NULL THEN
    
    -- Check if a sharing record already exists
    IF NOT EXISTS (
      SELECT 1 FROM boat_base_sharing
      WHERE boat_id = NEW.boat_id
        AND shared_with_base_id = NEW.destination_base_id
        AND shared_from = NEW.planned_start_date
        AND shared_until = NEW.planned_end_date
    ) THEN
      -- Create the sharing record
      INSERT INTO boat_base_sharing (
        boat_id,
        original_base_id,
        shared_with_base_id,
        shared_from,
        shared_until,
        reason,
        created_by
      ) VALUES (
        NEW.boat_id,
        NEW.base_id,
        NEW.destination_base_id,
        NEW.planned_start_date,
        NEW.planned_end_date,
        'ONE WAY rental',
        NEW.created_by
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER activate_one_way_sharing_trigger
  AFTER INSERT OR UPDATE OF is_one_way, destination_base_id, boat_id, planned_start_date, planned_end_date
  ON administrative_checkin_forms
  FOR EACH ROW
  EXECUTE FUNCTION activate_one_way_sharing();