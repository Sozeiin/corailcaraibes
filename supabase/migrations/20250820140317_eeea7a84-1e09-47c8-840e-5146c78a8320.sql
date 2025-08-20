-- Corriger complètement le système de synchronisation stock-commandes

-- 1. Supprimer l'ancien trigger et fonction défaillants dans le bon ordre
DROP TRIGGER IF EXISTS update_stock_item_purchase_info_trigger ON orders;
DROP TRIGGER IF EXISTS trigger_update_stock_purchase_info ON orders;
DROP FUNCTION IF EXISTS update_stock_item_purchase_info() CASCADE;

-- 2. Créer une fonction de synchronisation robuste et complète
CREATE OR REPLACE FUNCTION sync_order_to_stock_and_history()
RETURNS TRIGGER AS $$
DECLARE
  item_record RECORD;
  stock_item_record RECORD;
  purchase_history_id uuid;
BEGIN
  -- Se déclencher seulement sur les changements vers 'delivered' ou 'completed'
  IF NEW.status IN ('delivered', 'completed') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('delivered', 'completed')) THEN
    
    -- Traiter chaque item de la commande
    FOR item_record IN 
      SELECT oi.*, s.name as supplier_name
      FROM order_items oi
      LEFT JOIN suppliers s ON s.id = NEW.supplier_id
      WHERE oi.order_id = NEW.id
    LOOP
      -- Rechercher l'article stock correspondant avec logique améliorée
      SELECT si.* INTO stock_item_record
      FROM stock_items si
      WHERE si.base_id = NEW.base_id
      AND (
        -- Correspondance exacte par nom (priorité 1)
        (LOWER(TRIM(si.name)) = LOWER(TRIM(item_record.product_name)))
        OR
        -- Correspondance exacte par référence (priorité 2)
        (item_record.reference IS NOT NULL AND si.reference IS NOT NULL 
         AND LOWER(TRIM(si.reference)) = LOWER(TRIM(item_record.reference)))
        OR
        -- Correspondance partielle pour noms similaires (priorité 3)
        (LENGTH(si.name) > 3 AND LENGTH(item_record.product_name) > 3
         AND (
           LOWER(si.name) LIKE '%' || LOWER(item_record.product_name) || '%'
           OR LOWER(item_record.product_name) LIKE '%' || LOWER(si.name) || '%'
           OR similarity(si.name, item_record.product_name) > 0.7
         ))
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
        -- Article stock existant : mettre à jour la quantité et les infos d'achat
        UPDATE stock_items 
        SET 
          quantity = quantity + item_record.quantity,
          last_purchase_date = NEW.delivery_date,
          last_purchase_cost = item_record.unit_price,
          last_supplier_id = NEW.supplier_id,
          last_updated = NOW()
        WHERE id = stock_item_record.id;
        
        -- Lier l'item de commande à l'article stock
        UPDATE order_items 
        SET stock_item_id = stock_item_record.id
        WHERE id = item_record.id;
        
      ELSE
        -- Créer automatiquement un nouvel article stock
        INSERT INTO stock_items (
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
          COALESCE(item_record.reference, 'AUTO-' || substring(gen_random_uuid()::text, 1, 8)),
          'Livraison automatique',
          item_record.quantity,
          GREATEST(ROUND(item_record.quantity * 0.15), 1), -- Seuil minimum à 15%
          'pièce',
          'Livraison commande ' || NEW.order_number,
          NEW.base_id,
          NEW.delivery_date,
          item_record.unit_price,
          NEW.supplier_id,
          NOW()
        ) RETURNING id INTO stock_item_record.id;
        
        -- Lier l'item de commande au nouvel article stock
        UPDATE order_items 
        SET stock_item_id = stock_item_record.id
        WHERE id = item_record.id;
      END IF;
      
      -- Créer automatiquement l'historique d'achat pour traçabilité
      INSERT INTO component_purchase_history (
        stock_item_id,
        supplier_id,
        order_id,
        purchase_date,
        unit_cost,
        quantity,
        total_cost,
        warranty_months,
        invoice_reference,
        notes,
        order_item_id
      ) VALUES (
        stock_item_record.id,
        NEW.supplier_id,
        NEW.id,
        COALESCE(NEW.delivery_date::date, CURRENT_DATE),
        item_record.unit_price,
        item_record.quantity,
        item_record.unit_price * item_record.quantity,
        CASE 
          WHEN NEW.supplier_id IS NOT NULL THEN 12 -- 1 an de garantie par défaut
          ELSE 0
        END,
        NEW.order_number,
        'Achat automatique via commande ' || NEW.order_number,
        item_record.id
      );
      
    END LOOP;
    
    -- Créer une notification de succès pour l'utilisateur si possible
    BEGIN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data
      ) VALUES (
        COALESCE(NEW.requested_by, auth.uid()),
        'stock_sync_success',
        '✅ Stock mis à jour automatiquement',
        'Les articles de la commande ' || NEW.order_number || ' ont été ajoutés au stock avec l''historique d''achat.',
        jsonb_build_object(
          'order_id', NEW.id,
          'order_number', NEW.order_number,
          'sync_date', NOW()
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- Ignorer les erreurs de notification
      NULL;
    END;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Créer le nouveau trigger optimisé
CREATE TRIGGER trigger_sync_order_to_stock_and_history
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION sync_order_to_stock_and_history();

-- 4. Corriger les index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_stock_items_name_base_search 
  ON stock_items USING btree (base_id, lower(name));
  
CREATE INDEX IF NOT EXISTS idx_stock_items_reference_search 
  ON stock_items USING btree (base_id, lower(reference)) 
  WHERE reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
  ON order_items USING btree (order_id);