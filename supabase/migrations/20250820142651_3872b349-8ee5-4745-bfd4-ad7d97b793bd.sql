-- Simplifier le système de statuts des commandes
-- Garder le workflow complexe seulement pour les demandes d'achat

-- Ajouter une colonne pour marquer si les articles ont été ajoutés au stock
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stock_added BOOLEAN DEFAULT FALSE;

-- Créer une fonction pour ajouter des articles au stock depuis une commande
CREATE OR REPLACE FUNCTION public.add_order_items_to_stock(
  order_id_param UUID,
  selected_items JSONB DEFAULT NULL -- Tableau d'IDs des order_items à ajouter
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  order_record RECORD;
  item_record RECORD;
  stock_item_record RECORD;
  result JSONB := '{"added_items": [], "errors": []}'::JSONB;
  added_items JSONB := '[]'::JSONB;
  errors JSONB := '[]'::JSONB;
  delivery_time_days INTEGER;
BEGIN
  -- Récupérer la commande
  SELECT * INTO order_record FROM public.orders WHERE id = order_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Commande non trouvée');
  END IF;
  
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
      -- Chercher si l'article existe déjà dans le stock
      SELECT * INTO stock_item_record 
      FROM public.stock_items 
      WHERE base_id = order_record.base_id 
      AND (
        LOWER(name) = LOWER(item_record.product_name)
        OR (item_record.reference IS NOT NULL AND reference = item_record.reference)
      )
      LIMIT 1;
      
      IF FOUND THEN
        -- Mettre à jour l'article existant
        UPDATE public.stock_items 
        SET 
          quantity = quantity + item_record.quantity,
          last_updated = NOW()
        WHERE id = stock_item_record.id;
        
        -- Créer l'historique d'achat
        INSERT INTO public.component_purchase_history (
          stock_item_id,
          supplier_id,
          order_id,
          order_item_id,
          purchase_date,
          unit_cost,
          quantity,
          total_cost,
          warranty_months,
          notes
        ) VALUES (
          stock_item_record.id,
          order_record.supplier_id,
          order_record.id,
          item_record.id,
          COALESCE(order_record.delivery_date, order_record.order_date, CURRENT_DATE),
          item_record.unit_price,
          item_record.quantity,
          item_record.total_price,
          COALESCE(delivery_time_days, 0),
          'Ajout automatique depuis commande ' || order_record.order_number
        );
        
        added_items := added_items || jsonb_build_object(
          'item_name', item_record.product_name,
          'action', 'updated',
          'stock_item_id', stock_item_record.id,
          'quantity_added', item_record.quantity
        );
        
      ELSE
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
          item_record.product_name,
          item_record.reference,
          'Autre', -- catégorie par défaut
          item_record.quantity,
          1, -- seuil minimum par défaut
          'pièce',
          'Stock automatique',
          order_record.base_id,
          NOW()
        ) RETURNING id INTO stock_item_record;
        
        -- Créer l'historique d'achat pour le nouvel article
        INSERT INTO public.component_purchase_history (
          stock_item_id,
          supplier_id,
          order_id,
          order_item_id,
          purchase_date,
          unit_cost,
          quantity,
          total_cost,
          warranty_months,
          notes
        ) VALUES (
          stock_item_record.id,
          order_record.supplier_id,
          order_record.id,
          item_record.id,
          COALESCE(order_record.delivery_date, order_record.order_date, CURRENT_DATE),
          item_record.unit_price,
          item_record.quantity,
          item_record.total_price,
          COALESCE(delivery_time_days, 0),
          'Création automatique depuis commande ' || order_record.order_number
        );
        
        added_items := added_items || jsonb_build_object(
          'item_name', item_record.product_name,
          'action', 'created',
          'stock_item_id', stock_item_record.id,
          'quantity_added', item_record.quantity
        );
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      errors := errors || jsonb_build_object(
        'item_name', item_record.product_name,
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  -- Marquer la commande comme ayant ses articles ajoutés au stock
  UPDATE public.orders 
  SET stock_added = TRUE 
  WHERE id = order_id_param;
  
  RETURN jsonb_build_object(
    'added_items', added_items,
    'errors', errors,
    'success', TRUE
  );
END;
$$;