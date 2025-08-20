-- Fix supplier deletion permissions by updating RLS policies
-- Drop existing policies first
DROP POLICY IF EXISTS "Chef_base can manage suppliers in their base" ON public.suppliers;
DROP POLICY IF EXISTS "Direction can manage all suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can view suppliers" ON public.suppliers;

-- Create comprehensive policies for suppliers with proper DELETE permissions
-- 1. Direction can do everything on all suppliers
CREATE POLICY "Direction can manage all suppliers"
ON public.suppliers
FOR ALL
TO authenticated
USING (get_user_role() = 'direction')
WITH CHECK (get_user_role() = 'direction');

-- 2. Chef_base can manage suppliers in their base or global suppliers (base_id IS NULL)
CREATE POLICY "Chef_base can manage suppliers in their base"
ON public.suppliers
FOR ALL
TO authenticated  
USING (
  get_user_role() = 'chef_base' AND 
  (base_id = get_user_base_id() OR base_id IS NULL)
)
WITH CHECK (
  get_user_role() = 'chef_base' AND 
  (base_id = get_user_base_id() OR base_id IS NULL)
);

-- 3. All users can view suppliers based on their role and base
CREATE POLICY "Users can view suppliers"
ON public.suppliers
FOR SELECT
TO authenticated
USING (
  get_user_role() = 'direction' OR 
  base_id = get_user_base_id() OR 
  base_id IS NULL
);