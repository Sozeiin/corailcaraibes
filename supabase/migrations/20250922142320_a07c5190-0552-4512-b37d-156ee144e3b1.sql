-- Fix the link_stock_scan_to_supply_request function to properly handle supplier matching
CREATE OR REPLACE FUNCTION public.link_stock_scan_to_supply_request(
  p_stock_item_id UUID,
  p_supply_request_id UUID,
  p_quantity_received INTEGER,
  p_unit_cost NUMERIC DEFAULT 100.00
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_supply_request RECORD;
  v_supplier_id UUID;
  v_stock_item RECORD;
  v_result JSONB;
BEGIN
  -- Get supply request details
  SELECT * INTO v_supply_request
  FROM public.supply_requests
  WHERE id = p_supply_request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Supply request not found');
  END IF;

  -- Get stock item details
  SELECT * INTO v_stock_item
  FROM public.stock_items
  WHERE id = p_stock_item_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stock item not found');
  END IF;

  -- Find or create supplier if supplier_name exists
  IF v_supply_request.supplier_name IS NOT NULL AND TRIM(v_supply_request.supplier_name) != '' THEN
    -- Try to find existing supplier with exact name match (case insensitive)
    SELECT id INTO v_supplier_id
    FROM public.suppliers
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(v_supply_request.supplier_name))
    AND (base_id = v_stock_item.base_id OR base_id IS NULL)
    LIMIT 1;
    
    -- If not found, create new supplier
    IF v_supplier_id IS NULL THEN
      INSERT INTO public.suppliers (name, base_id, category)
      VALUES (
        TRIM(v_supply_request.supplier_name),
        v_stock_item.base_id,
        'Fournisseur'
      )
      RETURNING id INTO v_supplier_id;
    END IF;
  END IF;

  -- Create purchase history record
  INSERT INTO public.component_purchase_history (
    stock_item_id,
    supplier_id,
    purchase_date,
    unit_cost,
    quantity,
    warranty_months,
    installation_date,
    notes
  ) VALUES (
    p_stock_item_id,
    v_supplier_id,
    CURRENT_DATE,
    p_unit_cost,
    p_quantity_received,
    12,
    CURRENT_DATE,
    'Lié manuellement via scan - Demande: ' || v_supply_request.request_number
  );

  -- Update stock item's last_supplier_id if supplier found/created
  IF v_supplier_id IS NOT NULL THEN
    UPDATE public.stock_items
    SET last_supplier_id = v_supplier_id
    WHERE id = p_stock_item_id;
  END IF;

  -- Mark supply request as completed and link stock item
  UPDATE public.supply_requests
  SET 
    status = 'completed',
    completed_at = NOW(),
    stock_item_id = p_stock_item_id
  WHERE id = p_supply_request_id;

  v_result := jsonb_build_object(
    'success', true,
    'supplier_id', v_supplier_id,
    'supplier_name', v_supply_request.supplier_name,
    'message', 'Stock item successfully linked to supply request'
  );

  RETURN v_result;
END;
$$;