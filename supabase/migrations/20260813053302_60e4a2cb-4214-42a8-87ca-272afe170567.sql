-- Remplace la politique de lecture trop large sur stock_items
DROP POLICY IF EXISTS "Direction, chef_base and administratif can view stocks" ON public.stock_items;

CREATE POLICY "Stock visible selon role et base"
ON public.stock_items
FOR SELECT
TO authenticated
USING (
  get_user_role() IN ('direction'::user_role, 'administratif'::user_role)
  OR base_id = get_user_base_id()
);