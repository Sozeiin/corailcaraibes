CREATE TABLE public.stock_inventory_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL,
  stock_item_id uuid REFERENCES public.stock_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  item_reference text,
  base_id uuid NOT NULL REFERENCES public.bases(id),
  theoretical_qty numeric NOT NULL DEFAULT 0,
  counted_qty numeric NOT NULL DEFAULT 0,
  difference numeric NOT NULL DEFAULT 0,
  actor uuid,
  actor_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.stock_inventory_records TO authenticated;
GRANT ALL ON public.stock_inventory_records TO service_role;

ALTER TABLE public.stock_inventory_records ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_stock_inventory_records_session ON public.stock_inventory_records(session_id);
CREATE INDEX idx_stock_inventory_records_base ON public.stock_inventory_records(base_id);

CREATE POLICY "Inventory records viewable by base or direction"
ON public.stock_inventory_records
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'direction')
  OR base_id = public.get_user_base_id()
);

CREATE POLICY "Inventory records insertable by base or direction"
ON public.stock_inventory_records
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'direction')
  OR base_id = public.get_user_base_id()
);