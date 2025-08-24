-- Check for any remaining triggers on stock_items
SELECT t.trigger_name, t.event_manipulation, t.action_statement
FROM information_schema.triggers t
WHERE t.event_object_table = 'stock_items' 
AND t.trigger_schema = 'public';

-- Check if there are any functions called by stock updates that might be causing the issue
SELECT r.routine_name, r.routine_definition
FROM information_schema.routines r
WHERE r.routine_schema = 'public'
AND r.routine_definition ILIKE '%total_cost%';

-- Also check if there are any RLS policies that might be causing issues
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'stock_items';