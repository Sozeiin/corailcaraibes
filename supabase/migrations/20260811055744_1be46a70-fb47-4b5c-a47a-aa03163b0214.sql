-- 1. Security definer view -> security invoker
ALTER VIEW public.stock_product_pricing SET (security_invoker = true);
GRANT SELECT ON public.stock_product_pricing TO authenticated;

-- 2. Trigger functions should not be executable by API roles
REVOKE ALL ON FUNCTION public.ensure_stock_item_product() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_stock_product_from_item() FROM anon, authenticated;

-- 3. Remove anon-accessible storage policy (duplicate of the authenticated-scoped one)
DROP POLICY IF EXISTS "Users can update their purchase request photos" ON storage.objects;
