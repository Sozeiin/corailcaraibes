-- Add relationship between stock_items and order_items for purchase history tracking
-- This will help us track purchase history, suppliers, and costs for each stock item

-- Add a column to order_items to link to stock_items
ALTER TABLE public.order_items 
ADD COLUMN stock_item_id UUID REFERENCES public.stock_items(id);

-- Create an index for better performance on purchase history queries
CREATE INDEX idx_order_items_stock_item_id ON public.order_items(stock_item_id);

-- Add a column to track the unit cost at the time of purchase in stock_items
ALTER TABLE public.stock_items 
ADD COLUMN last_purchase_date DATE,
ADD COLUMN last_purchase_cost NUMERIC DEFAULT 0,
ADD COLUMN last_supplier_id UUID REFERENCES public.suppliers(id);

-- Create indexes for better performance
CREATE INDEX idx_stock_items_last_supplier ON public.stock_items(last_supplier_id);
CREATE INDEX idx_stock_items_last_purchase_date ON public.stock_items(last_purchase_date);

-- Create a function to update stock item purchase info when orders are delivered
CREATE OR REPLACE FUNCTION public.update_stock_item_purchase_info()
RETURNS TRIGGER AS $$
DECLARE
  item_record RECORD;
BEGIN
  -- Only process when order status changes to 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Update stock items with latest purchase information
    FOR item_record IN 
      SELECT oi.*, si.id as stock_id
      FROM order_items oi
      JOIN stock_items si ON (
        LOWER(si.name) = LOWER(oi.product_name) AND 
        si.base_id = NEW.base_id AND
        (oi.reference IS NULL OR si.reference = oi.reference OR si.reference IS NULL)
      )
      WHERE oi.order_id = NEW.id
    LOOP
      -- Update the stock item with purchase info
      UPDATE public.stock_items 
      SET 
        last_purchase_date = NEW.delivery_date,
        last_purchase_cost = item_record.unit_price,
        last_supplier_id = NEW.supplier_id,
        last_updated = NOW()
      WHERE id = item_record.stock_id;
      
      -- Also update the order_item with the stock_item_id for future reference
      UPDATE public.order_items 
      SET stock_item_id = item_record.stock_id
      WHERE id = item_record.id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update purchase info
CREATE TRIGGER trigger_update_stock_purchase_info
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stock_item_purchase_info();

-- Update existing data to establish relationships where possible
UPDATE public.order_items 
SET stock_item_id = si.id
FROM public.stock_items si, public.orders o
WHERE order_items.order_id = o.id
  AND LOWER(si.name) = LOWER(order_items.product_name)
  AND si.base_id = o.base_id
  AND (order_items.reference IS NULL OR si.reference = order_items.reference OR si.reference IS NULL);

-- Update stock items with latest purchase information from existing delivered orders
UPDATE public.stock_items 
SET 
  last_purchase_date = subq.delivery_date,
  last_purchase_cost = subq.unit_price,
  last_supplier_id = subq.supplier_id
FROM (
  SELECT DISTINCT ON (si.id) 
    si.id,
    o.delivery_date,
    oi.unit_price,
    o.supplier_id
  FROM stock_items si
  JOIN order_items oi ON oi.stock_item_id = si.id
  JOIN orders o ON o.id = oi.order_id
  WHERE o.status = 'delivered'
    AND o.delivery_date IS NOT NULL
  ORDER BY si.id, o.delivery_date DESC
) subq
WHERE stock_items.id = subq.id;