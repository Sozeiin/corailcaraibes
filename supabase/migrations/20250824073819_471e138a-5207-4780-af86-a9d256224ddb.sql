-- Fix the total_cost calculation trigger for intervention_parts
DROP TRIGGER IF EXISTS calculate_intervention_part_total_trigger ON public.intervention_parts;

-- Recreate the function to handle NULL values properly
CREATE OR REPLACE FUNCTION public.calculate_intervention_part_total()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate if both quantity and unit_cost are provided
  IF NEW.quantity IS NOT NULL AND NEW.unit_cost IS NOT NULL THEN
    NEW.total_cost = NEW.quantity * NEW.unit_cost;
  ELSE
    NEW.total_cost = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER calculate_intervention_part_total_trigger
  BEFORE INSERT OR UPDATE ON public.intervention_parts
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_intervention_part_total();

-- Also fix order_items total calculation if it exists
DROP TRIGGER IF EXISTS calculate_order_item_total_trigger ON public.order_items;

-- Update the order_items function to handle NULLs
CREATE OR REPLACE FUNCTION public.calculate_order_item_total()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate if both quantity and unit_price are provided
  IF NEW.quantity IS NOT NULL AND NEW.unit_price IS NOT NULL THEN
    NEW.total_price = NEW.quantity * NEW.unit_price;
  ELSE
    NEW.total_price = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger for order_items
CREATE TRIGGER calculate_order_item_total_trigger
  BEFORE INSERT OR UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_order_item_total();