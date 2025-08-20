-- Add tracking fields to orders table
ALTER TABLE public.orders 
ADD COLUMN tracking_number text,
ADD COLUMN carrier text;