CREATE OR REPLACE FUNCTION public.ensure_boat_rental_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.start_date IS NULL THEN
    NEW.start_date := now();
  END IF;
  IF NEW.end_date IS NULL THEN
    NEW.end_date := NEW.start_date;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_boat_rental_dates_trigger ON public.boat_rentals;

CREATE TRIGGER ensure_boat_rental_dates_trigger
BEFORE INSERT OR UPDATE ON public.boat_rentals
FOR EACH ROW
EXECUTE FUNCTION public.ensure_boat_rental_dates();