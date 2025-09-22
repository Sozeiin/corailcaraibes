-- Modifier la fonction link_stock_scan_to_supply_request pour gérer le fournisseur
CREATE OR REPLACE FUNCTION public.link_stock_scan_to_supply_request(scan_data jsonb, supply_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result jsonb;
  request_record RECORD;
  supplier_record RECORD;
  supplier_id_to_use uuid;
  stock_item_id_param uuid;
  quantity_received_param integer;
BEGIN
  -- Récupérer les détails de la demande d'approvisionnement
  SELECT * INTO request_record 
  FROM public.supply_requests 
  WHERE id = supply_request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Demande d''approvisionnement non trouvée');
  END IF;
  
  -- Extraire les données du scan
  stock_item_id_param := (scan_data->>'stock_item_id')::uuid;
  quantity_received_param := COALESCE((scan_data->>'quantity_received')::integer, 1);
  
  -- Gérer le fournisseur
  IF request_record.supplier_name IS NOT NULL AND trim(request_record.supplier_name) != '' THEN
    -- Chercher un fournisseur existant avec ce nom
    SELECT * INTO supplier_record
    FROM public.suppliers 
    WHERE LOWER(name) = LOWER(trim(request_record.supplier_name))
    AND (base_id = request_record.base_id OR base_id IS NULL)
    LIMIT 1;
    
    IF NOT FOUND THEN
      -- Créer un nouveau fournisseur
      INSERT INTO public.suppliers (name, base_id, category)
      VALUES (trim(request_record.supplier_name), request_record.base_id, 'Automatique')
      RETURNING id INTO supplier_id_to_use;
    ELSE
      supplier_id_to_use := supplier_record.id;
    END IF;
  END IF;
  
  -- Mettre à jour le statut de la demande
  UPDATE public.supply_requests 
  SET 
    status = 'completed',
    completed_at = now(),
    stock_item_id = stock_item_id_param
  WHERE id = supply_request_id;
  
  -- Créer une entrée dans l'historique d'achat
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
      supplier_id_to_use,
      CURRENT_DATE,
      COALESCE(request_record.purchase_price, 0),
      quantity_received_param,
      12,
      'Lié automatiquement via demande d''approvisionnement: ' || request_record.request_number
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Log l'erreur mais ne pas faire échouer l'opération
      INSERT INTO public.security_events (
        event_type,
        user_id,
        details
      ) VALUES (
        'auto_supply_link_error',
        auth.uid(),
        jsonb_build_object(
          'error', SQLERRM,
          'supply_request_id', supply_request_id,
          'stock_item_id', stock_item_id_param
        )
      );
  END;
  
  -- Mettre à jour le dernier fournisseur du stock
  IF supplier_id_to_use IS NOT NULL THEN
    UPDATE public.stock_items 
    SET last_supplier_id = supplier_id_to_use
    WHERE id = stock_item_id_param;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'request_number', request_record.request_number,
    'supplier', COALESCE(request_record.supplier_name, 'Fournisseur inconnu')
  );
END;
$function$;

-- Modifier la fonction link_stock_scan_to_order pour gérer le fournisseur
CREATE OR REPLACE FUNCTION public.link_stock_scan_to_order(stock_item_id_param uuid, order_id_param uuid, quantity_received_param integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  order_record RECORD;
  result jsonb;
BEGIN
  -- Récupérer les détails de la commande avec le fournisseur
  SELECT o.*, s.name as supplier_name, s.id as supplier_id_value
  INTO order_record 
  FROM public.orders o
  LEFT JOIN public.suppliers s ON s.id = o.supplier_id
  WHERE o.id = order_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Commande non trouvée');
  END IF;
  
  -- Mettre à jour le statut de la commande à 'received' au lieu de 'received_scanned'
  UPDATE public.orders 
  SET status = 'received',
      updated_at = now()
  WHERE id = order_id_param;
  
  -- Faire avancer le workflow automatiquement vers 'received' puis 'completed'
  PERFORM public.advance_workflow_step(
    order_id_param,
    'received'::public.purchase_workflow_status,
    auth.uid(),
    'Réception automatique via liaison manuelle - Quantité: ' || quantity_received_param
  );
  
  PERFORM public.advance_workflow_step(
    order_id_param,
    'completed'::public.purchase_workflow_status,
    auth.uid(),
    'Commande terminée automatiquement suite à la réception'
  );
  
  -- Créer une entrée dans l'historique d'achat avec le bon fournisseur
  BEGIN
    INSERT INTO public.component_purchase_history (
      stock_item_id,
      supplier_id,
      order_id,
      purchase_date,
      unit_cost,
      quantity,
      warranty_months,
      notes
    ) VALUES (
      stock_item_id_param,
      order_record.supplier_id_value,
      order_id_param,
      CURRENT_DATE,
      0, -- Prix unitaire à définir plus tard
      quantity_received_param,
      12,
      'Lié manuellement via scan - Commande: ' || order_record.order_number
    )
    ON CONFLICT (stock_item_id, order_id) DO UPDATE SET
      quantity = EXCLUDED.quantity,
      notes = EXCLUDED.notes,
      supplier_id = EXCLUDED.supplier_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log l'erreur mais ne pas faire échouer l'opération
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
          'order_id', order_id_param
        )
      );
  END;
  
  -- Mettre à jour le dernier fournisseur du stock
  IF order_record.supplier_id_value IS NOT NULL THEN
    UPDATE public.stock_items 
    SET last_supplier_id = order_record.supplier_id_value
    WHERE id = stock_item_id_param;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'order_number', order_record.order_number,
    'supplier', COALESCE(order_record.supplier_name, 'Fournisseur inconnu')
  );
END;
$function$;