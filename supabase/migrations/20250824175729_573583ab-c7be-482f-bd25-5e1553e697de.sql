-- Fix the handle_stock_scan_workflow function to exclude total_cost column
CREATE OR REPLACE FUNCTION public.handle_stock_scan_workflow()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  order_record RECORD;
  order_item_record RECORD;
  matched_count INTEGER := 0;
BEGIN
  -- Vérifier si c'est une augmentation de quantité (réception de stock)
  IF NEW.quantity > OLD.quantity THEN
    -- Chercher les commandes correspondantes en statut 'shipping_antilles'
    FOR order_record IN 
      SELECT DISTINCT o.id, o.order_number, o.requested_by, o.supplier_id, o.base_id
      FROM public.orders o
      JOIN public.order_items oi ON oi.order_id = o.id
      WHERE o.status = 'shipping_antilles'
        AND o.base_id = NEW.base_id
        AND (
          -- Correspondance exacte par nom
          LOWER(TRIM(oi.product_name)) = LOWER(TRIM(NEW.name))
          -- Correspondance par référence si elle existe
          OR (oi.reference IS NOT NULL AND NEW.reference IS NOT NULL 
              AND LOWER(TRIM(oi.reference)) = LOWER(TRIM(NEW.reference)))
          -- Correspondance partielle pour les noms longs
          OR (LENGTH(oi.product_name) > 5 AND LENGTH(NEW.name) > 5 
              AND (LOWER(oi.product_name) LIKE '%' || LOWER(NEW.name) || '%'
                   OR LOWER(NEW.name) LIKE '%' || LOWER(oi.product_name) || '%'))
        )
    LOOP
      -- Récupérer les détails de l'article commandé pour cette commande
      SELECT * INTO order_item_record
      FROM public.order_items oi
      WHERE oi.order_id = order_record.id
      AND (
        LOWER(TRIM(oi.product_name)) = LOWER(TRIM(NEW.name))
        OR (oi.reference IS NOT NULL AND NEW.reference IS NOT NULL 
            AND LOWER(TRIM(oi.reference)) = LOWER(TRIM(NEW.reference)))
        OR (LENGTH(oi.product_name) > 5 AND LENGTH(NEW.name) > 5 
            AND (LOWER(oi.product_name) LIKE '%' || LOWER(NEW.name) || '%'
                 OR LOWER(NEW.name) LIKE '%' || LOWER(oi.product_name) || '%'))
      )
      LIMIT 1;

      -- Créer l'historique d'achat automatiquement (SANS total_cost)
      IF order_item_record.id IS NOT NULL AND order_item_record.unit_price > 0 THEN
        INSERT INTO public.component_purchase_history (
          stock_item_id,
          supplier_id,
          order_id,
          purchase_date,
          unit_cost,
          quantity,
          warranty_months,
          installation_date,
          notes
        ) VALUES (
          NEW.id,
          order_record.supplier_id,
          order_record.id,
          CURRENT_DATE,
          order_item_record.unit_price,
          (NEW.quantity - OLD.quantity), -- Quantité ajoutée
          12, -- Garantie par défaut de 12 mois
          CURRENT_DATE,
          'Créé automatiquement lors du scan de réception - Commande: ' || order_record.order_number
        );
      END IF;

      -- Faire avancer automatiquement le workflow vers 'received_scanned'
      PERFORM public.advance_workflow_step(
        order_record.id,
        'received_scanned'::public.purchase_workflow_status,
        auth.uid(), -- L'utilisateur qui a scanné
        'Réception automatique via scan de stock - Article: ' || NEW.name || ' - Quantité ajoutée: ' || (NEW.quantity - OLD.quantity)
      );
      
      -- Puis directement vers 'completed'
      PERFORM public.advance_workflow_step(
        order_record.id,
        'completed'::public.purchase_workflow_status,
        auth.uid(),
        'Demande d''achat terminée automatiquement suite au scan de réception'
      );
      
      -- Créer une notification de réception automatique
      INSERT INTO public.workflow_notifications (
        order_id, recipient_user_id, notification_type, title, message
      ) VALUES (
        order_record.id,
        order_record.requested_by,
        'auto_completion',
        '✅ Demande d''achat terminée avec historique créé',
        'Votre demande d''achat ' || order_record.order_number || ' a été automatiquement marquée comme terminée. L''historique d''achat a été créé avec le prix de ' || order_item_record.unit_price || '€.'
      ) ON CONFLICT DO NOTHING;
      
      -- Résoudre les alertes liées à cette commande
      UPDATE public.workflow_alerts 
      SET is_resolved = true, resolved_at = now()
      WHERE order_id = order_record.id AND is_resolved = false;
      
      matched_count := matched_count + 1;
      
      -- Log pour traçabilité
      INSERT INTO public.security_events (
        event_type,
        user_id,
        details
      ) VALUES (
        'stock_scan_purchase_history_created',
        auth.uid(),
        jsonb_build_object(
          'stock_item_id', NEW.id,
          'stock_item_name', NEW.name,
          'order_id', order_record.id,
          'order_number', order_record.order_number,
          'unit_price', order_item_record.unit_price,
          'quantity_added', NEW.quantity - OLD.quantity,
          'purchase_history_created', true,
          'timestamp', now()
        )
      );
      
    END LOOP;
    
    -- Si des demandes ont été mises à jour, créer une alerte avec le bon type
    IF matched_count > 0 THEN
      INSERT INTO public.alerts (
        type,
        severity,
        title,
        message,
        base_id
      ) VALUES (
        'system',
        'info',
        'Historiques d''achat créés automatiquement',
        matched_count || ' demande(s) d''achat ont été automatiquement terminées avec création d''historique d''achat pour "' || NEW.name || '".',
        NEW.base_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$