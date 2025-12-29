-- Fix profiles with null tenant_id by setting them to the correct tenant based on their base
-- Laurent Quaeybeur and other users with base_id in Martinique/Guadeloupe should have tenant ab246e99-1748-476b-a53e-cec7e17f6c9b
UPDATE public.profiles 
SET tenant_id = 'ab246e99-1748-476b-a53e-cec7e17f6c9b'
WHERE tenant_id IS NULL 
AND base_id IN (
  '550e8400-e29b-41d4-a716-446655440001', -- Base Martinique
  '550e8400-e29b-41d4-a716-446655440002'  -- Base Guadeloupe
);