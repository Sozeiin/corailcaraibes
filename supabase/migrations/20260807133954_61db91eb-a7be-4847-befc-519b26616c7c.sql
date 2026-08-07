-- 1. Product master table
CREATE TABLE public.stock_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  reference text,
  category text,
  unit text,
  brand text,
  photo_url text,
  barcode text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.stock_products TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.stock_products TO authenticated;
GRANT ALL ON public.stock_products TO service_role;

ALTER TABLE public.stock_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view stock products"
ON public.stock_products FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can insert stock products"
ON public.stock_products FOR INSERT TO authenticated
WITH CHECK (get_user_role() = ANY (ARRAY['direction'::user_role,'administratif'::user_role,'chef_base'::user_role]));

CREATE POLICY "Managers can update stock products"
ON public.stock_products FOR UPDATE TO authenticated
USING (get_user_role() = ANY (ARRAY['direction'::user_role,'administratif'::user_role,'chef_base'::user_role]))
WITH CHECK (get_user_role() = ANY (ARRAY['direction'::user_role,'administratif'::user_role,'chef_base'::user_role]));

CREATE POLICY "Direction and administratif can delete stock products"
ON public.stock_products FOR DELETE TO authenticated
USING (get_user_role() = ANY (ARRAY['direction'::user_role,'administratif'::user_role]));

CREATE TRIGGER update_stock_products_updated_at
BEFORE UPDATE ON public.stock_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_stock_products_name ON public.stock_products (lower(name));
CREATE INDEX idx_stock_products_reference ON public.stock_products (reference);
CREATE INDEX idx_stock_products_barcode ON public.stock_products (barcode);

-- 2. Link existing per-base stock lines to a product record
ALTER TABLE public.stock_items
  ADD COLUMN product_id uuid REFERENCES public.stock_products(id) ON DELETE CASCADE;

INSERT INTO public.stock_products (id, name, reference, category, unit, brand, photo_url, barcode)
SELECT gen_random_uuid(), si.name, si.reference, si.category, si.unit, si.brand, si.photo_url, si.barcode
FROM public.stock_items si;

-- match back one-to-one using a deterministic pairing
WITH ranked_items AS (
  SELECT id, row_number() OVER (ORDER BY id) rn FROM public.stock_items
), ranked_products AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) rn FROM public.stock_products
)
UPDATE public.stock_items si
SET product_id = rp.id
FROM ranked_items ri
JOIN ranked_products rp ON rp.rn = ri.rn
WHERE si.id = ri.id;

-- realign the generated product rows with their stock line content
UPDATE public.stock_products p
SET name = si.name,
    reference = si.reference,
    category = si.category,
    unit = si.unit,
    brand = si.brand,
    photo_url = si.photo_url,
    barcode = si.barcode
FROM public.stock_items si
WHERE si.product_id = p.id;

CREATE INDEX idx_stock_items_product_id ON public.stock_items (product_id);
CREATE UNIQUE INDEX idx_stock_items_product_base ON public.stock_items (product_id, base_id) WHERE product_id IS NOT NULL AND base_id IS NOT NULL;

-- 3. Auto-create a product for legacy inserts without product_id
CREATE OR REPLACE FUNCTION public.ensure_stock_item_product()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_product_id uuid;
BEGIN
  IF NEW.product_id IS NULL THEN
    INSERT INTO public.stock_products (name, reference, category, unit, brand, photo_url, barcode)
    VALUES (NEW.name, NEW.reference, NEW.category, NEW.unit, NEW.brand, NEW.photo_url, NEW.barcode)
    RETURNING id INTO v_product_id;
    NEW.product_id := v_product_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_stock_item_product_trigger
BEFORE INSERT ON public.stock_items
FOR EACH ROW EXECUTE FUNCTION public.ensure_stock_item_product();

-- keep product master in sync when the shared fields are edited on a stock line
CREATE OR REPLACE FUNCTION public.sync_stock_product_from_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.product_id IS NOT NULL AND (
    NEW.name IS DISTINCT FROM OLD.name OR
    NEW.reference IS DISTINCT FROM OLD.reference OR
    NEW.category IS DISTINCT FROM OLD.category OR
    NEW.unit IS DISTINCT FROM OLD.unit OR
    NEW.brand IS DISTINCT FROM OLD.brand OR
    NEW.photo_url IS DISTINCT FROM OLD.photo_url OR
    NEW.barcode IS DISTINCT FROM OLD.barcode
  ) THEN
    UPDATE public.stock_products
    SET name = NEW.name, reference = NEW.reference, category = NEW.category,
        unit = NEW.unit, brand = NEW.brand, photo_url = NEW.photo_url, barcode = NEW.barcode
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_stock_product_from_item_trigger
AFTER UPDATE ON public.stock_items
FOR EACH ROW EXECUTE FUNCTION public.sync_stock_product_from_item();

-- 4. Administratif gets global stock visibility like direction
CREATE POLICY "Administratif can manage all stock items"
ON public.stock_items FOR ALL TO authenticated
USING (get_user_role() = 'administratif'::user_role)
WITH CHECK (get_user_role() = 'administratif'::user_role);

-- 5. Pricing visible to everyone, regardless of base
CREATE OR REPLACE VIEW public.stock_product_pricing AS
SELECT si.product_id,
       si.id AS stock_item_id,
       si.base_id,
       b.name AS base_name,
       si.unit_price,
       si.supplier_reference,
       si.last_supplier_id,
       s.name AS supplier_name,
       si.last_purchase_cost,
       si.last_purchase_date,
       si.last_updated
FROM public.stock_items si
LEFT JOIN public.bases b ON b.id = si.base_id
LEFT JOIN public.suppliers s ON s.id = si.last_supplier_id;

ALTER VIEW public.stock_product_pricing SET (security_invoker = false);
GRANT SELECT ON public.stock_product_pricing TO authenticated;

-- 6. Purchase history and quotes readable by every authenticated user
CREATE POLICY "All authenticated can view stock purchase history"
ON public.stock_purchase_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "All authenticated can view stock item quotes"
ON public.stock_item_quotes FOR SELECT TO authenticated USING (true);

-- 7. Merge duplicate product records
CREATE OR REPLACE FUNCTION public.merge_stock_products(keep_id uuid, merge_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_item record;
  v_target uuid;
  v_moved int := 0;
  v_merged int := 0;
BEGIN
  v_role := get_user_role();
  IF v_role IS NULL OR v_role NOT IN ('direction'::user_role, 'administratif'::user_role) THEN
    RAISE EXCEPTION 'Seuls les profils direction et administratif peuvent fusionner des fiches produit';
  END IF;

  FOR v_item IN
    SELECT * FROM public.stock_items
    WHERE product_id = ANY (merge_ids) AND product_id <> keep_id
  LOOP
    SELECT id INTO v_target FROM public.stock_items
    WHERE product_id = keep_id AND base_id IS NOT DISTINCT FROM v_item.base_id
    LIMIT 1;

    IF v_target IS NOT NULL THEN
      UPDATE public.stock_items
      SET quantity = COALESCE(quantity, 0) + COALESCE(v_item.quantity, 0),
          last_updated = now()
      WHERE id = v_target;

      UPDATE public.stock_movements SET sku = (SELECT reference FROM public.stock_items WHERE id = v_target) WHERE sku = v_item.reference;
      UPDATE public.stock_purchase_history SET stock_item_id = v_target WHERE stock_item_id = v_item.id;
      UPDATE public.stock_inventory_records SET stock_item_id = v_target WHERE stock_item_id = v_item.id;
      UPDATE public.stock_reservations SET stock_item_id = v_target WHERE stock_item_id = v_item.id;
      UPDATE public.stock_item_quotes SET stock_item_id = v_target WHERE stock_item_id = v_item.id;
      UPDATE public.component_stock_links SET stock_item_id = v_target WHERE stock_item_id = v_item.id;
      UPDATE public.order_items SET stock_item_id = v_target WHERE stock_item_id = v_item.id;
      UPDATE public.intervention_parts SET stock_item_id = v_target WHERE stock_item_id = v_item.id;
      UPDATE public.supply_requests SET stock_item_id = v_target WHERE stock_item_id = v_item.id;

      DELETE FROM public.stock_items WHERE id = v_item.id;
    ELSE
      UPDATE public.stock_items SET product_id = keep_id WHERE id = v_item.id;
    END IF;
    v_moved := v_moved + 1;
  END LOOP;

  DELETE FROM public.stock_products
  WHERE id = ANY (merge_ids) AND id <> keep_id
    AND NOT EXISTS (SELECT 1 FROM public.stock_items WHERE product_id = stock_products.id);
  v_merged := v_merged + 1;

  RETURN jsonb_build_object('success', true, 'moved_levels', v_moved, 'kept_product', keep_id);
END;
$$;

REVOKE ALL ON FUNCTION public.merge_stock_products(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_stock_products(uuid, uuid[]) TO authenticated;