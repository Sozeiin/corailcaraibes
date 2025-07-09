-- Create a function to calculate total price for order items
CREATE OR REPLACE FUNCTION public.calculate_order_item_total()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total_price as quantity * unit_price
  NEW.total_price = NEW.quantity * NEW.unit_price;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate total_price on insert or update
CREATE TRIGGER calculate_order_item_total_trigger
  BEFORE INSERT OR UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_order_item_total();