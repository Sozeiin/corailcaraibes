-- Étape 1: Désactiver temporairement le trigger problématique
DROP TRIGGER IF EXISTS stock_scan_workflow_trigger ON public.stock_items;

-- Créer une fonction simple qui ne gère que la mise à jour de stock
CREATE OR REPLACE FUNCTION public.simple_stock_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Simplement mettre à jour le timestamp de dernière modification
  NEW.last_updated = now();
  RETURN NEW;
END;
$function$;

-- Créer un nouveau trigger simple pour les mises à jour de stock
CREATE TRIGGER simple_stock_update_trigger
  BEFORE UPDATE ON public.stock_items
  FOR EACH ROW
  EXECUTE FUNCTION public.simple_stock_update();

-- Simplifier les statuts de commande - Mettre à jour les statuts existants
UPDATE public.orders 
SET status = CASE 
  WHEN status IN ('pending_approval', 'approved', 'supplier_search') THEN 'draft'
  WHEN status IN ('order_confirmed', 'shipping_antilles') THEN 'ordered'
  WHEN status IN ('received_scanned') THEN 'received'
  WHEN status = 'completed' THEN 'completed'
  ELSE status
END
WHERE status IN ('pending_approval', 'approved', 'supplier_search', 'order_confirmed', 'shipping_antilles', 'received_scanned');

-- Créer une fonction pour lier manuellement un scan à une commande
CREATE OR REPLACE FUNCTION public.link_stock_scan_to_order(
  stock_item_id_param uuid,
  order_id_param uuid,
  quantity_received_param integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  order_record RECORD;
  result jsonb;
BEGIN
  -- Récupérer les détails de la commande
  SELECT o.*, s.name as supplier_name 
  INTO order_record 
  FROM public.orders o
  LEFT JOIN public.suppliers s ON s.id = o.supplier_id
  WHERE o.id = order_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Commande non trouvée');
  END IF;
  
  -- Mettre à jour le statut de la commande à 'received'
  UPDATE public.orders 
  SET status = 'received',
      updated_at = now()
  WHERE id = order_id_param;
  
  -- Créer une entrée dans l'historique d'achat (optionnel)
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
      order_record.supplier_id,
      order_id_param,
      CURRENT_DATE,
      0, -- Prix unitaire à définir plus tard
      quantity_received_param,
      12,
      'Lié manuellement via scan - Commande: ' || order_record.order_number
    )
    ON CONFLICT (stock_item_id, order_id) DO UPDATE SET
      quantity = EXCLUDED.quantity,
      notes = EXCLUDED.notes;
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
  
  RETURN jsonb_build_object(
    'success', true, 
    'order_number', order_record.order_number,
    'supplier', order_record.supplier_name
  );
END;
$function$;