-- Fix the stock_items table by ensuring there's no total_cost column causing issues
-- First, let's check if there's somehow a total_cost column in stock_items
SELECT column_name, data_type, column_default, is_nullable, generation_expression
FROM information_schema.columns 
WHERE table_name = 'stock_items' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Let's also check if there are any constraints or triggers causing issues
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.stock_items'::regclass;

-- If there's somehow a total_cost column, we'll drop it
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stock_items' 
        AND column_name = 'total_cost' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.stock_items DROP COLUMN total_cost;
        RAISE NOTICE 'Dropped total_cost column from stock_items';
    END IF;
END $$;