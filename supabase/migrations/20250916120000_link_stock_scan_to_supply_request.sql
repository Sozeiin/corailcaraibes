CREATE OR REPLACE FUNCTION public.link_stock_scan_to_supply_request(
  stock_item_id_param uuid,
  request_id_param uuid,
  quantity_received_param integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_record RECORD;
BEGIN
  -- Fetch the supply request details
  SELECT sr.*, s.id AS supplier_id
  INTO request_record
  FROM public.supply_requests sr
  LEFT JOIN public.suppliers s ON s.name = sr.supplier_name
  WHERE sr.id = request_id_param;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Demande non trouvée');
  END IF;

  -- Mark request as completed and link stock item
  UPDATE public.supply_requests
  SET
    status = 'completed',
    completed_at = now(),
    stock_item_id = stock_item_id_param,
    updated_at = now()
  WHERE id = request_id_param;

  -- Log purchase history (optional)
  BEGIN
    INSERT INTO public.component_purchase_history (
      stock_item_id,
      supplier_id,
      purchase_date,
      unit_cost,
      quantity,
      warranty_months,
      notes
    ) VALUES (
      stock_item_id_param,
      request_record.supplier_id,
      CURRENT_DATE,
      0,
      quantity_received_param,
      12,
      'Lié manuellement via scan - Demande: ' || request_record.request_number
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail the operation
      INSERT INTO public.security_events (
        event_type,
        user_id,
        details
      ) VALUES (
        'manual_stock_link_error',
        auth.uid(),
        jsonb_build_object(
          'error', SQLERRM,
          'stock_item_id', stock_item_id_param,
          'request_id', request_id_param
        )
      );
  END;

  -- Notify the requester
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
    'Votre demande ' || request_record.request_number || ' a été clôturée suite à la réception en stock.',
    jsonb_build_object(
      'request_id', request_record.id,
      'request_number', request_record.request_number,
      'stock_item_id', stock_item_id_param
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'request_number', request_record.request_number
  );
END;
$$;
