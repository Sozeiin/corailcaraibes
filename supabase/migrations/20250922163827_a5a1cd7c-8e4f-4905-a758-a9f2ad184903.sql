-- Phase 5: Add reception tracking columns to shipment_items
ALTER TABLE public.shipment_items 
ADD COLUMN IF NOT EXISTS received_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS received_by uuid,
ADD COLUMN IF NOT EXISTS stock_movement_id uuid;

-- Create RPC function to handle shipment item reception
CREATE OR REPLACE FUNCTION public.handle_shipment_item_reception(
  item_sku text,
  destination_base_id uuid,
  received_by_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  shipment_item_record RECORD;
  stock_item_record RECORD;
  movement_id uuid;
  result jsonb;
BEGIN
  -- Find matching shipment item
  SELECT si.*, s.destination_base_id as dest_base
  INTO shipment_item_record
  FROM public.shipment_items si
  JOIN public.shipments s ON s.id = si.shipment_id
  WHERE si.sku = item_sku
  AND s.destination_base_id = destination_base_id
  AND s.status = 'shipped'
  AND si.received_at IS NULL
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Aucun article d''expédition en attente trouvé'
    );
  END IF;
  
  -- Find corresponding stock item
  SELECT * INTO stock_item_record
  FROM public.stock_items
  WHERE (name ILIKE '%' || shipment_item_record.product_label || '%'
         OR reference = item_sku)
  AND base_id = destination_base_id
  LIMIT 1;
  
  -- Create stock movement
  INSERT INTO public.stock_movements (
    stock_item_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    notes,
    created_by
  ) VALUES (
    stock_item_record.id,
    'inbound_distribution',
    shipment_item_record.qty,
    'shipment',
    shipment_item_record.shipment_id,
    'Réception automatique expédition - SKU: ' || item_sku,
    received_by_user_id
  ) RETURNING id INTO movement_id;
  
  -- Update stock quantity if stock item exists
  IF stock_item_record.id IS NOT NULL THEN
    UPDATE public.stock_items
    SET 
      quantity = quantity + shipment_item_record.qty,
      last_updated = now()
    WHERE id = stock_item_record.id;
  END IF;
  
  -- Mark shipment item as received
  UPDATE public.shipment_items
  SET 
    received_at = now(),
    received_by = received_by_user_id,
    stock_movement_id = movement_id
  WHERE id = shipment_item_record.id;
  
  -- Check if shipment is fully received
  UPDATE public.shipments
  SET status = CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM public.shipment_items si2 
      WHERE si2.shipment_id = shipment_item_record.shipment_id 
      AND si2.received_at IS NULL
    ) THEN 'delivered'
    ELSE status
  END
  WHERE id = shipment_item_record.shipment_id;
  
  result := jsonb_build_object(
    'success', true,
    'message', 'Article reçu automatiquement',
    'shipment_id', shipment_item_record.shipment_id,
    'stock_item_id', stock_item_record.id,
    'movement_id', movement_id
  );
  
  RETURN result;
END;
$$;