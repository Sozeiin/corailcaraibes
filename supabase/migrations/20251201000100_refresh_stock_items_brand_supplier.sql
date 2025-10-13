-- Ensure brand and supplier reference columns exist on stock_items and refresh the PostgREST cache
ALTER TABLE public.stock_items
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS supplier_reference text;

-- Force PostgREST to reload the schema so the new columns are available immediately
NOTIFY pgrst, 'reload schema';
