-- Check for any triggers that might be causing the issue with stock_items updates
-- First, let's see if there are any triggers on stock_items or related tables

DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    -- List all triggers in the public schema
    FOR trigger_record IN 
        SELECT t.trigger_name, t.event_object_table, t.action_timing, t.event_manipulation
        FROM information_schema.triggers t
        WHERE t.trigger_schema = 'public'
        ORDER BY t.event_object_table, t.trigger_name
    LOOP
        RAISE NOTICE 'Trigger: % on table: % - % %', 
            trigger_record.trigger_name, 
            trigger_record.event_object_table, 
            trigger_record.action_timing, 
            trigger_record.event_manipulation;
    END LOOP;
END $$;