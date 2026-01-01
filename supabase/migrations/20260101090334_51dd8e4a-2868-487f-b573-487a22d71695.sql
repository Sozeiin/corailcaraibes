-- Fix Peter's tenant_id (administratif@martinique.com has incorrect tenant)
UPDATE public.profiles 
SET tenant_id = 'ab246e99-1748-476b-a53e-cec7e17f6c9b'
WHERE id = 'c6019e64-20d6-4263-8e35-c4aedf4c6448'
AND tenant_id = '531d38f3-a6aa-4634-aeed-8d55ebf0e602';

-- Fix any other profiles with inconsistent tenant_id for Martinique/Guadeloupe bases
UPDATE public.profiles 
SET tenant_id = 'ab246e99-1748-476b-a53e-cec7e17f6c9b'
WHERE base_id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002'
)
AND (tenant_id IS NULL OR tenant_id != 'ab246e99-1748-476b-a53e-cec7e17f6c9b');