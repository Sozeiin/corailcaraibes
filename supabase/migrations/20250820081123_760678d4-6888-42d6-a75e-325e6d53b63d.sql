-- Fix foreign key constraint issue when deleting suppliers
-- Add CASCADE option to foreign key constraints for suppliers

-- Drop existing foreign key constraint if it exists
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_supplier_id_fkey;

-- Recreate the foreign key constraint with SET NULL on delete
-- This way when a supplier is deleted, related orders will have supplier_id set to NULL
ALTER TABLE public.orders 
ADD CONSTRAINT orders_supplier_id_fkey 
FOREIGN KEY (supplier_id) 
REFERENCES public.suppliers(id) 
ON DELETE SET NULL;