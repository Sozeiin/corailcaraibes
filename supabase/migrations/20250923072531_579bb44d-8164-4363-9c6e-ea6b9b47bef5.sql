-- Fix the add_item_by_scan function to include tenant_id when creating packages
CREATE OR REPLACE FUNCTION public.add_item_by_scan(
  p_shipment_id uuid, 
  p_sku text, 
  p_qty integer DEFAULT 1, 
  p_package_code text DEFAULT NULL::text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_stock_item RECORD;
  v_shipment RECORD;
  v_package_id UUID;
  v_result TEXT;
BEGIN
  -- Log the incoming parameters for debugging
  RAISE LOG 'add_item_by_scan called with: shipment_id=%, sku=%, qty=%, package_code=%', 
    p_shipment_id, p_sku, p_qty, p_package_code;

  -- Validate shipment exists and is in draft status
  SELECT * INTO v_shipment 
  FROM shipments 
  WHERE id = p_shipment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expédition non trouvée avec l''ID: %', p_shipment_id;
  END IF;
  
  IF v_shipment.status != 'draft' THEN
    RAISE EXCEPTION 'L''expédition n''est pas en mode brouillon (statut actuel: %)', v_shipment.status;
  END IF;

  -- Find stock item by SKU/reference with flexible matching
  SELECT * INTO v_stock_item 
  FROM stock_items 
  WHERE base_id = v_shipment.source_base_id
  AND (
    reference = p_sku OR 
    reference ILIKE '%' || p_sku || '%' OR
    name ILIKE '%' || p_sku || '%'
  )
  ORDER BY 
    CASE WHEN reference = p_sku THEN 1 ELSE 2 END,
    char_length(reference)
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Article non trouvé avec la référence "%" dans la base source. Vérifiez que l''article existe dans le stock.', p_sku;
  END IF;

  -- Check stock availability
  IF v_stock_item.quantity < p_qty THEN
    RAISE EXCEPTION 'Stock insuffisant pour l''article "%" (demandé: %, disponible: %)', 
      v_stock_item.name, p_qty, v_stock_item.quantity;
  END IF;

  -- Create or get package
  IF p_package_code IS NOT NULL THEN
    -- Try to find existing package
    SELECT id INTO v_package_id 
    FROM shipment_packages 
    WHERE shipment_id = p_shipment_id 
    AND package_code = p_package_code;
    
    -- Create package if it doesn't exist - FIXED: Include tenant_id
    IF NOT FOUND THEN
      INSERT INTO shipment_packages (shipment_id, package_code, tenant_id)
      VALUES (p_shipment_id, p_package_code, v_shipment.tenant_id)
      RETURNING id INTO v_package_id;
      
      RAISE LOG 'Created new package: % for shipment: % with tenant_id: %', 
        p_package_code, p_shipment_id, v_shipment.tenant_id;
    END IF;
  END IF;

  -- Check if item already exists in shipment (to update quantity instead of creating duplicate)
  DECLARE
    v_existing_item_id UUID;
  BEGIN
    SELECT id INTO v_existing_item_id 
    FROM shipment_items 
    WHERE shipment_id = p_shipment_id 
    AND sku = v_stock_item.reference
    AND (package_id = v_package_id OR (package_id IS NULL AND v_package_id IS NULL));
    
    IF FOUND THEN
      -- Update existing item quantity
      UPDATE shipment_items 
      SET qty = qty + p_qty
      WHERE id = v_existing_item_id;
      
      v_result := 'Article mis à jour: ' || v_stock_item.name || ' (nouvelle quantité: ' || (SELECT qty FROM shipment_items WHERE id = v_existing_item_id) || ')';
    ELSE
      -- Insert new item
      INSERT INTO shipment_items (
        shipment_id,
        package_id,
        sku,
        product_label,
        qty
      ) VALUES (
        p_shipment_id,
        v_package_id,
        v_stock_item.reference,
        v_stock_item.name,
        p_qty
      );
      
      v_result := 'Article ajouté: ' || v_stock_item.name || ' (quantité: ' || p_qty || ')';
    END IF;
  END;

  RAISE LOG 'Successfully processed item: % (result: %)', v_stock_item.name, v_result;
  
  RETURN v_result;
  
EXCEPTION 
  WHEN OTHERS THEN
    -- Log the error for debugging
    RAISE LOG 'Error in add_item_by_scan: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    -- Re-raise the exception to be handled by the client
    RAISE;
END;
$function$;