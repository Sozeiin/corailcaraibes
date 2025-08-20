-- Add missing workflow statuses to order_status enum
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'supplier_search';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'order_confirmed';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'received_scanned';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'rejected';

-- Update the orders table status column constraint to allow text values
-- This allows both old enum values and new workflow statuses
ALTER TABLE public.orders 
ALTER COLUMN status TYPE text;