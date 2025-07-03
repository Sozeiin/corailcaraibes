-- Fix the total_price column in order_items to allow custom values
ALTER TABLE public.order_items 
ALTER COLUMN total_price DROP DEFAULT,
ALTER COLUMN total_price SET NOT NULL;