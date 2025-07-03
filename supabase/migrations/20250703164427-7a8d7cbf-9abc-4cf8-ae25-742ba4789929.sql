-- Fix the bulk order delivery trigger to avoid conflicts
CREATE OR REPLACE FUNCTION public.handle_bulk_order_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Si le statut passe à 'delivered' et que c'est un achat en gros
  IF NEW.status = 'delivered' AND NEW.is_bulk_purchase = true AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Vérifier s'il y a des distributions avant de traiter
    IF EXISTS (SELECT 1 FROM bulk_purchase_distributions WHERE order_id = NEW.id AND received_quantity > 0) THEN
      -- Pour les achats en gros, on utilise les distributions pour mettre à jour le stock
      INSERT INTO public.stock_items (
        name,
        reference,
        category,
        quantity,
        min_threshold,
        unit,
        location,
        base_id,
        last_updated
      )
      SELECT 
        oi.product_name,
        NULL, -- La référence sera générée automatiquement
        COALESCE(s.category, 'Autre'),
        bd.received_quantity,
        GREATEST(ROUND(bd.received_quantity * 0.1), 1),
        'pièce',
        'Achat groupé ' || NEW.order_number,
        bd.base_id,
        NOW()
      FROM order_items oi
      LEFT JOIN suppliers s ON s.id = NEW.supplier_id
      INNER JOIN bulk_purchase_distributions bd ON bd.order_item_id = oi.id
      WHERE oi.order_id = NEW.id 
      AND bd.received_quantity > 0
      ON CONFLICT (name, base_id)
      DO UPDATE SET
        quantity = stock_items.quantity + EXCLUDED.quantity,
        last_updated = NOW();
        
      -- Mettre à jour le statut de distribution
      UPDATE public.bulk_purchase_distributions 
      SET status = 'distributed'
      WHERE order_id = NEW.id AND received_quantity > 0;
    END IF;
    
    -- Log de l'opération
    INSERT INTO public.alerts (
      type,
      severity,
      title,
      message,
      base_id
    ) VALUES (
      'stock',
      'info',
      'Achat groupé créé',
      'L''achat groupé ' || NEW.order_number || ' a été créé et est prêt pour la distribution.',
      NEW.base_id
    );
  -- Sinon utiliser la logique normale pour les commandes standard
  ELSIF NEW.status = 'delivered' AND (NEW.is_bulk_purchase IS NULL OR NEW.is_bulk_purchase = false) AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Logique existante pour les commandes normales
    INSERT INTO public.stock_items (
      name,
      reference,
      category,
      quantity,
      min_threshold,
      unit,
      location,
      base_id,
      last_updated
    )
    SELECT 
      oi.product_name,
      NULL,
      COALESCE(s.category, 'Autre'),
      oi.quantity,
      GREATEST(ROUND(oi.quantity * 0.1), 1),
      'pièce',
      'Livraison ' || NEW.order_number,
      NEW.base_id,
      NOW()
    FROM order_items oi
    LEFT JOIN suppliers s ON s.id = NEW.supplier_id
    WHERE oi.order_id = NEW.id
    ON CONFLICT (name, base_id)
    DO UPDATE SET
      quantity = stock_items.quantity + EXCLUDED.quantity,
      last_updated = NOW();
      
    INSERT INTO public.alerts (
      type,
      severity,
      title,
      message,
      base_id
    ) VALUES (
      'stock',
      'info',
      'Stock mis à jour automatiquement',
      'Les articles de la commande ' || NEW.order_number || ' ont été ajoutés au stock suite à la livraison.',
      NEW.base_id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;