-- Add brand and supplier reference columns to stock_items
ALTER TABLE public.stock_items
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS supplier_reference text;

-- Update indexes to include supplier reference search by base if needed
CREATE INDEX IF NOT EXISTS idx_stock_items_supplier_reference_search
  ON public.stock_items USING btree (base_id, lower(supplier_reference));
