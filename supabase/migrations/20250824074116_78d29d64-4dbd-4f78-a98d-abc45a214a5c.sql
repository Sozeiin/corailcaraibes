-- Drop the problematic trigger temporarily to fix the immediate issue
DROP TRIGGER IF EXISTS handle_stock_scan_workflow_trigger ON public.stock_items;

-- Check if purchase_workflow_steps table has total_cost column and fix it
SELECT column_name, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'purchase_workflow_steps' 
AND table_schema = 'public' 
AND column_name = 'total_cost';