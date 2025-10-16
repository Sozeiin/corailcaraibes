-- Migration: Grant administratif role the same permissions as chef_base (Part 2)
-- This migration continues updating RLS policies for remaining tables

-- ============================================
-- STOCK_ITEMS TABLE  
-- ============================================
DROP POLICY IF EXISTS "Direction and chef_base can manage stock items" ON public.stock_items;
CREATE POLICY "Direction, chef_base and administratif can manage stock items" 
ON public.stock_items 
FOR ALL 
USING (
  (has_role(auth.uid(), 'direction'::app_role) OR 
   has_role(auth.uid(), 'chef_base'::app_role) OR 
   has_role(auth.uid(), 'administratif'::app_role)) 
  AND (has_role(auth.uid(), 'direction'::app_role) OR base_id = get_user_base_id())
);

-- ============================================
-- STOCK_MOVEMENTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Direction and chef_base can manage stock movements" ON public.stock_movements;
CREATE POLICY "Direction, chef_base and administratif can manage stock movements" 
ON public.stock_movements 
FOR ALL 
USING (
  (has_role(auth.uid(), 'direction'::app_role) OR 
   has_role(auth.uid(), 'chef_base'::app_role) OR 
   has_role(auth.uid(), 'administratif'::app_role)) 
  AND (has_role(auth.uid(), 'direction'::app_role) OR base_id = get_user_base_id())
);

-- ============================================
-- SUPPLIERS TABLE
-- ============================================
DROP POLICY IF EXISTS "Direction and chef_base can manage suppliers" ON public.suppliers;
CREATE POLICY "Direction, chef_base and administratif can manage suppliers" 
ON public.suppliers 
FOR ALL 
USING (
  has_role(auth.uid(), 'direction'::app_role) OR 
  has_role(auth.uid(), 'chef_base'::app_role) OR 
  has_role(auth.uid(), 'administratif'::app_role)
);

-- ============================================
-- ORDERS TABLE
-- ============================================
DROP POLICY IF EXISTS "Chef_base can manage orders" ON public.orders;
CREATE POLICY "Chef_base and administratif can manage orders" 
ON public.orders 
FOR ALL 
USING (
  (has_role(auth.uid(), 'chef_base'::app_role) OR 
   has_role(auth.uid(), 'administratif'::app_role)) 
  AND base_id = get_user_base_id()
)
WITH CHECK (
  (has_role(auth.uid(), 'chef_base'::app_role) OR 
   has_role(auth.uid(), 'administratif'::app_role)) 
  AND base_id = get_user_base_id()
);

-- ============================================
-- ORDER_ITEMS TABLE
-- ============================================
DROP POLICY IF EXISTS "Chef_base can manage order items" ON public.order_items;
CREATE POLICY "Chef_base and administratif can manage order items" 
ON public.order_items 
FOR ALL 
USING (
  (has_role(auth.uid(), 'chef_base'::app_role) OR 
   has_role(auth.uid(), 'administratif'::app_role)) 
  AND base_id = get_user_base_id()
)
WITH CHECK (
  (has_role(auth.uid(), 'chef_base'::app_role) OR 
   has_role(auth.uid(), 'administratif'::app_role)) 
  AND base_id = get_user_base_id()
);

-- ============================================
-- PLANNING_ACTIVITIES TABLE
-- ============================================
DROP POLICY IF EXISTS "Chef_base can manage planning activities" ON public.planning_activities;
CREATE POLICY "Chef_base and administratif can manage planning activities" 
ON public.planning_activities 
FOR ALL 
USING (
  (has_role(auth.uid(), 'chef_base'::app_role) OR 
   has_role(auth.uid(), 'administratif'::app_role)) 
  AND base_id = get_user_base_id()
)
WITH CHECK (
  (has_role(auth.uid(), 'chef_base'::app_role) OR 
   has_role(auth.uid(), 'administratif'::app_role)) 
  AND base_id = get_user_base_id()
);