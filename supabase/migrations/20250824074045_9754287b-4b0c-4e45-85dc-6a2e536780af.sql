-- Find the specific trigger that's causing the issue
-- Check if there's a trigger on stock_items that creates records with total_cost

-- Examine the handle_stock_scan_workflow function since it might be triggered on stock updates
SELECT routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'handle_stock_scan_workflow' 
AND routine_schema = 'public';