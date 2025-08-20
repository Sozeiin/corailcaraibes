-- Vérifier s'il y a un trigger qui calcule automatiquement total_cost
-- et corriger la fonction pour ne pas définir total_cost manuellement

-- Voir les triggers sur la table component_purchase_history
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'component_purchase_history';

-- Corriger la fonction pour ne pas définir total_cost explicitement
CREATE OR REPLACE FUNCTION public.add_order_items_to_stock(
  order_id_param UUID,
  selected_items JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_record RECORD;
  item_record RECORD;
  stock_item_record RECORD;
  added_items JSONB := '[]'::JSONB;
  errors JSONB := '[]'::JSONB;
  delivery_time_days INTEGER;
  new_stock_item_id UUID;
BEGIN
  -- Log de début
  RAISE NOTICE 'Début add_order_items_to_stock pour order_id: %, selected_items: %', order_id_param, selected_items;
  
  -- Récupérer la commande
  SELECT * INTO order_record FROM public.orders WHERE id = order_id_param;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'Commande non trouvée: %', order_id_param;
    RETURN jsonb_build_object('error', 'Commande non trouvée', 'success', false);
  END IF;
  
  RAISE NOTICE 'Commande trouvée: %, base_id: %', order_record.order_number, order_record.base_id;
  
  -- Calculer le délai de livraison en jours
  IF order_record.delivery_date IS NOT NULL AND order_record.order_date IS NOT NULL THEN
    delivery_time_days := (order_record.delivery_date - order_record.order_date);
  ELSE
    delivery_time_days := NULL;
  END IF;
  
  -- Traiter chaque article de la commande
  FOR item_record IN 
    SELECT oi.* FROM public.order_items oi 
    WHERE oi.order_id = order_id_param
    AND (selected_items IS NULL OR oi.id::text = ANY(SELECT jsonb_array_elements_text(selected_items)))
  LOOP
    BEGIN
      RAISE NOTICE 'Traitement article: % (id: %)', item_record.product_name, item_record.id;
      
      -- Chercher si l'article existe déjà dans le stock
      SELECT * INTO stock_item_record 
      FROM public.stock_items 
      WHERE base_id = order_record.base_id 
      AND (
        LOWER(TRIM(name)) = LOWER(TRIM(item_record.product_name))
        OR (item_record.reference IS NOT NULL AND TRIM(reference) = TRIM(item_record.reference))
      )
      LIMIT 1;
      
      IF FOUND THEN
        RAISE NOTICE 'Article existant trouvé: %, mise à jour quantité', stock_item_record.name;
        
        -- Mettre à jour l'article existant
        UPDATE public.stock_items 
        SET 
          quantity = quantity + item_record.quantity,
          last_updated = NOW()
        WHERE id = stock_item_record.id;
        
        new_stock_item_id := stock_item_record.id;
        
      ELSE
        RAISE NOTICE 'Création nouvel article de stock: %', item_record.product_name;
        
        -- Créer un nouvel article de stock
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
        ) VALUES (
          TRIM(item_record.product_name),
          CASE WHEN item_record.reference IS NOT NULL THEN TRIM(item_record.reference) ELSE NULL END,
          'Autre',
          item_record.quantity,
          1,
          'pièce',
          'Stock automatique',
          order_record.base_id,
          NOW()
        ) RETURNING id INTO new_stock_item_id;
        
      END IF;
      
      -- Créer l'historique d'achat SANS spécifier total_cost
      -- (laisse le trigger le calculer automatiquement)
      RAISE NOTICE 'Création historique achat pour stock_item_id: %', new_stock_item_id;
      
      INSERT INTO public.component_purchase_history (
        stock_item_id,
        supplier_id,
        order_id,
        order_item_id,
        purchase_date,
        unit_cost,
        quantity,
        warranty_months,
        notes
      ) VALUES (
        new_stock_item_id,
        order_record.supplier_id,
        order_record.id,
        item_record.id,
        COALESCE(order_record.delivery_date, order_record.order_date, CURRENT_DATE),
        item_record.unit_price,
        item_record.quantity,
        COALESCE(delivery_time_days, 0),
        'Ajout automatique depuis commande ' || order_record.order_number
      );
      
      added_items := added_items || jsonb_build_object(
        'item_name', item_record.product_name,
        'action', CASE WHEN stock_item_record.id IS NOT NULL THEN 'updated' ELSE 'created' END,
        'stock_item_id', new_stock_item_id,
        'quantity_added', item_record.quantity
      );
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Erreur pour article %: %', item_record.product_name, SQLERRM;
      errors := errors || jsonb_build_object(
        'item_name', item_record.product_name,
        'item_id', item_record.id,
        'error', SQLERRM,
        'sqlstate', SQLSTATE
      );
    END;
  END LOOP;
  
  -- Marquer la commande comme ayant ses articles ajoutés au stock
  IF jsonb_array_length(added_items) > 0 THEN
    UPDATE public.orders 
    SET stock_added = TRUE 
    WHERE id = order_id_param;
    RAISE NOTICE 'Commande marquée comme stock_added = true';
  END IF;
  
  RAISE NOTICE 'Fin fonction: % articles ajoutés, % erreurs', jsonb_array_length(added_items), jsonb_array_length(errors);
  
  RETURN jsonb_build_object(
    'added_items', added_items,
    'errors', errors,
    'success', TRUE
  );
END;
$$;