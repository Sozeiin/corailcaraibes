-- Update existing purchase history entries to link correct suppliers
-- For APP-000007 with LANCELIN supplier
UPDATE public.component_purchase_history 
SET supplier_id = (
  SELECT id FROM public.suppliers 
  WHERE LOWER(TRIM(name)) = 'lancelin' 
  LIMIT 1
)
WHERE notes LIKE '%APP-000007%' 
AND supplier_id IS NULL;

-- For APP-000008 with BIG SHIP supplier  
UPDATE public.component_purchase_history 
SET supplier_id = (
  SELECT id FROM public.suppliers 
  WHERE LOWER(TRIM(name)) = 'big ship' 
  LIMIT 1
)
WHERE notes LIKE '%APP-000008%' 
AND supplier_id IS NULL;

-- Update stock items last_supplier_id for the item that had these purchases
UPDATE public.stock_items 
SET last_supplier_id = (
  SELECT supplier_id FROM public.component_purchase_history 
  WHERE stock_item_id = 'dc29fe4c-183a-4cd5-8b5d-e936b0a74bb5'
  AND supplier_id IS NOT NULL
  ORDER BY created_at DESC 
  LIMIT 1
)
WHERE id = 'dc29fe4c-183a-4cd5-8b5d-e936b0a74bb5';