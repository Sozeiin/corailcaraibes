-- Insert missing profile for current user with chef_base role
INSERT INTO public.profiles (id, email, name, role, base_id)
SELECT 
  auth.uid(),
  COALESCE(u.email, 'user@example.com'),
  COALESCE(u.raw_user_meta_data->>'name', 'Utilisateur'),
  'chef_base'::user_role,
  '550e8400-e29b-41d4-a716-446655440002'::uuid
FROM auth.users u 
WHERE u.id = auth.uid()
AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid());