-- Fix DORMELLE: move to Guadeloupe and set available
UPDATE boats 
SET base_id = '550e8400-e29b-41d4-a716-446655440002', 
    status = 'available', 
    updated_at = now() 
WHERE id = 'b54420dc-e454-45a7-9e29-372fcae1beaf';