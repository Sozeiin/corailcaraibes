-- Corriger la fonction RPC pour utiliser les nouveaux statuts simplifiés
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

-- Mettre à jour la fonction advance_workflow_step pour supporter les nouveaux statuts
CREATE OR REPLACE FUNCTION public.advance_workflow_step(
  order_id_param uuid, 
  new_status purchase_workflow_status, 
  user_id_param uuid DEFAULT NULL::uuid, 
  notes_param text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_step RECORD;
  step_info RECORD;
  user_name_val TEXT;
BEGIN
  -- Récupérer le nom de l'utilisateur
  IF user_id_param IS NOT NULL THEN
    SELECT COALESCE(p.name, auth.email()) INTO user_name_val 
    FROM public.profiles p 
    WHERE p.id = user_id_param;
  END IF;
  
  -- Marquer l'étape actuelle comme terminée
  UPDATE public.purchase_workflow_steps 
  SET 
    completed_at = now(),
    duration_minutes = EXTRACT(EPOCH FROM (now() - started_at))/60,
    notes = COALESCE(notes_param, notes)
  WHERE order_id = order_id_param 
    AND completed_at IS NULL;
  
  -- Déterminer les informations de la nouvelle étape
  SELECT 
    CASE new_status
      WHEN 'pending_approval' THEN 1
      WHEN 'approved' THEN 2
      WHEN 'supplier_search' THEN 3
      WHEN 'ordered' THEN 4
      WHEN 'received' THEN 5
      WHEN 'completed' THEN 6
      WHEN 'rejected' THEN 99
      WHEN 'cancelled' THEN 98
      ELSE 0
    END as step_number,
    CASE new_status
      WHEN 'pending_approval' THEN 'En attente d''approbation'
      WHEN 'approved' THEN 'Approuvé par direction'
      WHEN 'supplier_search' THEN 'Recherche de fournisseurs'
      WHEN 'ordered' THEN 'Commande passée'
      WHEN 'received' THEN 'Réception confirmée'
      WHEN 'completed' THEN 'Terminé'
      WHEN 'rejected' THEN 'Rejeté'
      WHEN 'cancelled' THEN 'Annulé'
      ELSE 'Étape inconnue'
    END as step_name,
    CASE new_status
      WHEN 'pending_approval' THEN 'Demande en attente d''approbation par la direction'
      WHEN 'approved' THEN 'Demande approuvée, prête pour la recherche de fournisseurs'
      WHEN 'supplier_search' THEN 'Recherche et négociation avec les fournisseurs'
      WHEN 'ordered' THEN 'Commande passée et confirmée par le fournisseur'
      WHEN 'received' THEN 'Produits reçus et confirmés'
      WHEN 'completed' THEN 'Processus d''achat terminé avec succès'
      WHEN 'rejected' THEN 'Demande rejetée par la direction'
      WHEN 'cancelled' THEN 'Demande annulée'
      ELSE 'Description non disponible'
    END as step_description
  INTO step_info;
  
  -- Créer la nouvelle étape
  INSERT INTO public.purchase_workflow_steps (
    order_id, 
    step_status, 
    step_number, 
    step_name, 
    step_description,
    user_id,
    user_name,
    notes,
    completed_at
  ) VALUES (
    order_id_param,
    new_status,
    step_info.step_number,
    step_info.step_name,
    step_info.step_description,
    user_id_param,
    user_name_val,
    notes_param,
    CASE WHEN new_status IN ('rejected', 'cancelled', 'completed') THEN now() ELSE NULL END
  );
  
  -- Mettre à jour le statut de la commande
  UPDATE public.orders 
  SET 
    status = new_status::text,
    approved_by = CASE WHEN new_status = 'approved' THEN user_id_param ELSE approved_by END,
    approved_at = CASE WHEN new_status = 'approved' THEN now() ELSE approved_at END
  WHERE id = order_id_param;
END;
$function$;