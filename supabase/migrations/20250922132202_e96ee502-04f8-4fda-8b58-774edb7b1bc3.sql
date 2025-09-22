-- Fix the link_stock_scan_to_supply_request function by removing invalid ON CONFLICT clause
CREATE OR REPLACE FUNCTION public.link_stock_scan_to_supply_request(
  stock_item_id_param uuid, 
  request_id_param uuid, 
  quantity_received_param integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  request_record RECORD;
  result jsonb;
BEGIN
  -- Get the supply request details
  SELECT sr.*, p.name as requester_name 
  INTO request_record 
  FROM public.supply_requests sr
  LEFT JOIN public.profiles p ON p.id = sr.requested_by
  WHERE sr.id = request_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Demande d''approvisionnement non trouvée');
  END IF;
  
  -- Update the supply request status to completed and link stock item
  UPDATE public.supply_requests 
  SET 
    status = 'completed',
    completed_at = now(),
    stock_item_id = stock_item_id_param,
    updated_at = now()
  WHERE id = request_id_param;
  
  -- Create purchase history entry (always create new entry, no conflict handling)
  INSERT INTO public.component_purchase_history (
    stock_item_id,
    purchase_date,
    unit_cost,
    quantity,
    total_cost,
    warranty_months,
    notes
  ) VALUES (
    stock_item_id_param,
    CURRENT_DATE,
    COALESCE(request_record.purchase_price, 0),
    quantity_received_param,
    COALESCE(request_record.purchase_price, 0) * quantity_received_param,
    12,
    'Lié manuellement via scan - Demande: ' || request_record.request_number
  );
  
  -- Create notification for the requester
  IF request_record.requested_by IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      request_record.requested_by,
      'supply_request_completed',
      '✅ Demande d''approvisionnement terminée',
      'Votre demande ' || request_record.request_number || ' a été liée au stock et marquée comme terminée.',
      jsonb_build_object(
        'request_id', request_id_param,
        'request_number', request_record.request_number,
        'stock_item_id', stock_item_id_param
      )
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Demande d''approvisionnement liée avec succès',
    'request_number', request_record.request_number,
    'requester', request_record.requester_name
  );
END;
$function$;