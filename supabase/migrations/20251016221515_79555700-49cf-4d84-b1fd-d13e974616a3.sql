-- Étape 1 : Supprimer l'ancienne politique dupliquée sur order_items
DROP POLICY IF EXISTS "Direction and chef_base can manage order items" ON public.order_items;

-- Étape 2 : Mettre à jour la politique orders
DROP POLICY IF EXISTS "Direction and chef_base can manage orders" ON public.orders;

CREATE POLICY "Direction, chef_base and administratif can manage orders"
ON public.orders
FOR ALL
TO public
USING (
  (get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role, 'administratif'::user_role]))
  AND (
    (get_user_role() = 'direction'::user_role) 
    OR (base_id = get_user_base_id())
  )
);

-- Étape 3 : Mettre à jour les politiques stock_items
DROP POLICY IF EXISTS "Chef_base and direction can view all stocks" ON public.stock_items;
DROP POLICY IF EXISTS "Chef_base can manage stock in their base" ON public.stock_items;

CREATE POLICY "Direction, chef_base and administratif can view stocks"
ON public.stock_items
FOR SELECT
TO public
USING (
  (get_user_role() = 'direction'::user_role) 
  OR (get_user_role() = 'chef_base'::user_role)
  OR (get_user_role() = 'administratif'::user_role)
);

CREATE POLICY "Chef_base and administratif can manage stock in their base"
ON public.stock_items
FOR ALL
TO public
USING (
  ((get_user_role() = 'chef_base'::user_role) OR (get_user_role() = 'administratif'::user_role))
  AND (base_id = get_user_base_id())
);

-- Étape 4 : Mettre à jour la politique supply_requests
DROP POLICY IF EXISTS "Chef_base can update their own pending requests" ON public.supply_requests;

CREATE POLICY "Chef_base and administratif can update their pending requests"
ON public.supply_requests
FOR UPDATE
TO public
USING (
  ((get_user_role() = 'chef_base'::user_role) OR (get_user_role() = 'administratif'::user_role))
  AND (base_id = get_user_base_id())
);