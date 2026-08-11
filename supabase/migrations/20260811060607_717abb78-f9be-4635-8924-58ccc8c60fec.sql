CREATE TABLE public.stock_product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.stock_products(id) ON DELETE CASCADE,
  base_id uuid REFERENCES public.bases(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name text,
  supplier_reference text,
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  currency text NOT NULL DEFAULT 'EUR',
  minimum_quantity integer NOT NULL DEFAULT 1,
  price_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_product_prices TO authenticated;
GRANT ALL ON public.stock_product_prices TO service_role;

ALTER TABLE public.stock_product_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Prices readable by all authenticated"
ON public.stock_product_prices FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Staff can add prices"
ON public.stock_product_prices FOR INSERT TO authenticated
WITH CHECK (public.get_user_role() IN ('direction', 'administratif', 'chef_base'));

CREATE POLICY "Staff can update their prices"
ON public.stock_product_prices FOR UPDATE TO authenticated
USING (
  public.get_user_role() IN ('direction', 'administratif')
  OR (public.get_user_role() = 'chef_base' AND created_by = auth.uid())
);

CREATE POLICY "Staff can delete their prices"
ON public.stock_product_prices FOR DELETE TO authenticated
USING (
  public.get_user_role() IN ('direction', 'administratif')
  OR (public.get_user_role() = 'chef_base' AND created_by = auth.uid())
);

CREATE INDEX idx_stock_product_prices_product ON public.stock_product_prices(product_id, price_date DESC);

CREATE TRIGGER update_stock_product_prices_updated_at
BEFORE UPDATE ON public.stock_product_prices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();