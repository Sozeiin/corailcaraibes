-- Phase 1: Améliorer la fonction de synchronisation des informations d'achat
CREATE OR REPLACE FUNCTION public.update_stock_item_purchase_info()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  item_record RECORD;
  stock_item_record RECORD;
BEGIN
  -- Only process when order status changes to 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Update stock items with latest purchase information and create links
    FOR item_record IN 
      SELECT oi.*, s.name as supplier_name
      FROM order_items oi
      LEFT JOIN suppliers s ON s.id = NEW.supplier_id
      WHERE oi.order_id = NEW.id
    LOOP
      -- Find matching stock item with improved logic
      SELECT si.* INTO stock_item_record
      FROM stock_items si
      WHERE si.base_id = NEW.base_id
      AND (
        -- Exact name match
        (LOWER(TRIM(si.name)) = LOWER(TRIM(item_record.product_name)))
        OR
        -- Exact reference match
        (item_record.reference IS NOT NULL AND si.reference IS NOT NULL 
         AND LOWER(TRIM(si.reference)) = LOWER(TRIM(item_record.reference)))
        OR
        -- Similarity match for partial names
        (LENGTH(si.name) > 3 AND LENGTH(item_record.product_name) > 3
         AND similarity(si.name, item_record.product_name) > 0.8)
      )
      ORDER BY 
        CASE 
          WHEN LOWER(TRIM(si.name)) = LOWER(TRIM(item_record.product_name)) THEN 1
          WHEN item_record.reference IS NOT NULL AND si.reference IS NOT NULL 
               AND LOWER(TRIM(si.reference)) = LOWER(TRIM(item_record.reference)) THEN 2
          ELSE 3
        END
      LIMIT 1;
      
      IF stock_item_record.id IS NOT NULL THEN
        -- Update existing stock item with purchase info
        UPDATE public.stock_items 
        SET 
          quantity = quantity + item_record.quantity,
          last_purchase_date = NEW.delivery_date,
          last_purchase_cost = item_record.unit_price,
          last_supplier_id = NEW.supplier_id,
          last_updated = NOW()
        WHERE id = stock_item_record.id;
        
        -- Create the link in order_items
        UPDATE public.order_items 
        SET stock_item_id = stock_item_record.id
        WHERE id = item_record.id;
        
      ELSE
        -- Create new stock item if no match found
        INSERT INTO public.stock_items (
          name,
          reference,
          category,
          quantity,
          min_threshold,
          unit,
          location,
          base_id,
          last_purchase_date,
          last_purchase_cost,
          last_supplier_id,
          last_updated
        ) VALUES (
          item_record.product_name,
          COALESCE(item_record.reference, public.generate_stock_reference()),
          'Livraison',
          item_record.quantity,
          GREATEST(ROUND(item_record.quantity * 0.1), 1),
          'pièce',
          'Livraison ' || NEW.order_number,
          NEW.base_id,
          NEW.delivery_date,
          item_record.unit_price,
          NEW.supplier_id,
          NOW()
        ) RETURNING id INTO stock_item_record.id;
        
        -- Create the link in order_items
        UPDATE public.order_items 
        SET stock_item_id = stock_item_record.id
        WHERE id = item_record.id;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Phase 2: Script de réparation pour les données existantes
-- Réparer les liens manquants pour les commandes déjà livrées
DO $$
DECLARE
  order_record RECORD;
  item_record RECORD;
  stock_item_record RECORD;
BEGIN
  -- Traiter toutes les commandes livrées sans liens stock_item_id
  FOR order_record IN 
    SELECT DISTINCT o.*
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.status = 'delivered'
    AND oi.stock_item_id IS NULL
  LOOP
    -- Pour chaque article de cette commande
    FOR item_record IN 
      SELECT oi.*
      FROM order_items oi
      WHERE oi.order_id = order_record.id
      AND oi.stock_item_id IS NULL
    LOOP
      -- Chercher l'article de stock correspondant
      SELECT si.* INTO stock_item_record
      FROM stock_items si
      WHERE si.base_id = order_record.base_id
      AND (
        LOWER(TRIM(si.name)) = LOWER(TRIM(item_record.product_name))
        OR
        (item_record.reference IS NOT NULL AND si.reference IS NOT NULL 
         AND LOWER(TRIM(si.reference)) = LOWER(TRIM(item_record.reference)))
        OR
        (LENGTH(si.name) > 3 AND LENGTH(item_record.product_name) > 3
         AND similarity(si.name, item_record.product_name) > 0.8)
      )
      ORDER BY 
        CASE 
          WHEN LOWER(TRIM(si.name)) = LOWER(TRIM(item_record.product_name)) THEN 1
          WHEN item_record.reference IS NOT NULL AND si.reference IS NOT NULL 
               AND LOWER(TRIM(si.reference)) = LOWER(TRIM(item_record.reference)) THEN 2
          ELSE 3
        END
      LIMIT 1;
      
      IF stock_item_record.id IS NOT NULL THEN
        -- Créer le lien
        UPDATE public.order_items 
        SET stock_item_id = stock_item_record.id
        WHERE id = item_record.id;
        
        -- Mettre à jour les infos d'achat si cette commande est plus récente
        UPDATE public.stock_items 
        SET 
          last_purchase_date = CASE 
            WHEN order_record.delivery_date > COALESCE(last_purchase_date, '1900-01-01'::date) 
            THEN order_record.delivery_date 
            ELSE last_purchase_date 
          END,
          last_purchase_cost = CASE 
            WHEN order_record.delivery_date > COALESCE(last_purchase_date, '1900-01-01'::date) 
            THEN item_record.unit_price 
            ELSE last_purchase_cost 
          END,
          last_supplier_id = CASE 
            WHEN order_record.delivery_date > COALESCE(last_purchase_date, '1900-01-01'::date) 
            THEN order_record.supplier_id 
            ELSE last_supplier_id 
          END,
          last_updated = NOW()
        WHERE id = stock_item_record.id;
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Réparation des liens commandes-stock terminée';
END $$;