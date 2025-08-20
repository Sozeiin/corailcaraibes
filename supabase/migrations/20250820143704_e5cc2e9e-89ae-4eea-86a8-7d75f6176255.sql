-- Simplifier au maximum la fonction pour identifier le problème
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
  new_stock_item_id UUID;
BEGIN
  RAISE NOTICE 'DEBUT: order_id=%, selected_items=%', order_id_param, selected_items;
  
  -- Récupérer la commande
  SELECT * INTO order_record FROM public.orders WHERE id = order_id_param;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'ERREUR: Commande non trouvée';
    RETURN jsonb_build_object('error', 'Commande non trouvée', 'success', false);
  END IF;
  
  RAISE NOTICE 'COMMANDE TROUVEE: %, base_id=%', order_record.order_number, order_record.base_id;
  
  -- Traiter chaque article sélectionné
  FOR item_record IN 
    SELECT oi.* FROM public.order_items oi 
    WHERE oi.order_id = order_id_param
    AND (selected_items IS NULL OR oi.id::text = ANY(SELECT jsonb_array_elements_text(selected_items)))
  LOOP
    BEGIN
      RAISE NOTICE 'TRAITEMENT ARTICLE: % (quantity=%, unit_price=%)', item_record.product_name, item_record.quantity, item_record.unit_price;
      
      -- Chercher dans le stock existant
      SELECT * INTO stock_item_record 
      FROM public.stock_items 
      WHERE base_id = order_record.base_id 
      AND LOWER(TRIM(name)) = LOWER(TRIM(item_record.product_name))
      LIMIT 1;
      
      IF FOUND THEN
        RAISE NOTICE 'STOCK EXISTANT TROUVE: %', stock_item_record.name;
        -- Mettre à jour le stock existant
        UPDATE public.stock_items 
        SET quantity = quantity + item_record.quantity, last_updated = NOW()
        WHERE id = stock_item_record.id;
        new_stock_item_id := stock_item_record.id;
      ELSE
        RAISE NOTICE 'CREATION NOUVEAU STOCK: %', item_record.product_name;
        -- Créer nouvel article de stock
        INSERT INTO public.stock_items (
          name, category, quantity, min_threshold, unit, location, base_id, last_updated
        ) VALUES (
          TRIM(item_record.product_name), 'Autre', item_record.quantity, 1, 'pièce', 'Auto', order_record.base_id, NOW()
        ) RETURNING id INTO new_stock_item_id;
      END IF;
      
      RAISE NOTICE 'STOCK ITEM ID: %', new_stock_item_id;
      
      -- Créer l'historique - VERSION MINIMALE
      INSERT INTO public.component_purchase_history (
        stock_item_id,
        purchase_date,
        unit_cost,
        quantity
      ) VALUES (
        new_stock_item_id,
        CURRENT_DATE,
        item_record.unit_price,
        item_record.quantity
      );
      
      RAISE NOTICE 'HISTORIQUE CREE AVEC SUCCES';
      
      added_items := added_items || jsonb_build_object(
        'item_name', item_record.product_name,
        'quantity', item_record.quantity,
        'stock_item_id', new_stock_item_id
      );
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'ERREUR ARTICLE %: % (SQLSTATE: %)', item_record.product_name, SQLERRM, SQLSTATE;
      errors := errors || jsonb_build_object(
        'item_name', item_record.product_name,
        'error', SQLERRM,
        'sqlstate', SQLSTATE
      );
    END;
  END LOOP;
  
  RAISE NOTICE 'FIN: % ajouts, % erreurs', jsonb_array_length(added_items), jsonb_array_length(errors);
  
  RETURN jsonb_build_object(
    'added_items', added_items,
    'errors', errors,
    'success', TRUE
  );
END;
$$;