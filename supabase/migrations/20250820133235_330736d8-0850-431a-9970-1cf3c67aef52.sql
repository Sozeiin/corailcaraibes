-- Corriger la synchronisation entre les statuts orders et workflow
-- Modifier la fonction pour qu'elle se déclenche sur les deux systèmes

-- D'abord, améliorer la fonction existante pour gérer les deux types de statut
CREATE OR REPLACE FUNCTION public.update_stock_item_purchase_info()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  item_record RECORD;
  stock_item_record RECORD;
BEGIN
  -- Se déclencher quand le statut orders passe à 'delivered' OU quand il y a des workflow steps 'received_scanned' ou 'completed'
  IF (NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered')) THEN
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

-- Créer une fonction pour synchroniser le statut orders avec le workflow
CREATE OR REPLACE FUNCTION public.sync_order_status_from_workflow()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Quand une étape de workflow est complétée, mettre à jour le statut de la commande correspondant
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    UPDATE public.orders 
    SET status = CASE 
      WHEN NEW.step_status = 'completed' THEN 'delivered'
      WHEN NEW.step_status = 'received_scanned' THEN 'delivered'
      WHEN NEW.step_status = 'order_confirmed' THEN 'confirmed'
      WHEN NEW.step_status = 'cancelled' THEN 'cancelled'
      WHEN NEW.step_status = 'rejected' THEN 'cancelled'
      ELSE status -- garder le statut existant pour les autres étapes
    END
    WHERE id = NEW.order_id
    AND status != CASE 
      WHEN NEW.step_status = 'completed' THEN 'delivered'
      WHEN NEW.step_status = 'received_scanned' THEN 'delivered'
      WHEN NEW.step_status = 'order_confirmed' THEN 'confirmed'
      WHEN NEW.step_status = 'cancelled' THEN 'cancelled'
      WHEN NEW.step_status = 'rejected' THEN 'cancelled'
      ELSE status
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Créer le trigger pour synchroniser automatiquement
DROP TRIGGER IF EXISTS sync_order_status_trigger ON purchase_workflow_steps;
CREATE TRIGGER sync_order_status_trigger
  AFTER UPDATE ON purchase_workflow_steps
  FOR EACH ROW
  EXECUTE FUNCTION sync_order_status_from_workflow();

-- Également, mettre à jour la fonction pour qu'elle fonctionne quand on change manuellement le statut
-- Si on passe manuellement une commande à "delivered", créer automatiquement les étapes workflow manquantes
CREATE OR REPLACE FUNCTION public.sync_workflow_from_order_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Si le statut passe à 'delivered' manuellement et qu'il n'y a pas d'étape 'completed' dans le workflow
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    -- Vérifier s'il y a déjà une étape completed
    IF NOT EXISTS (
      SELECT 1 FROM purchase_workflow_steps 
      WHERE order_id = NEW.id AND step_status = 'completed'
    ) THEN
      -- Créer l'étape completed automatiquement
      INSERT INTO purchase_workflow_steps (
        order_id, step_status, step_number, step_name, step_description,
        completed_at, auto_completed, notes
      ) VALUES (
        NEW.id,
        'completed',
        7,
        'Terminé',
        'Processus d''achat terminé suite à changement manuel du statut',
        NOW(),
        true,
        'Étape créée automatiquement suite au changement de statut manuel vers "Livrée"'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Créer le trigger pour cette synchronisation
DROP TRIGGER IF EXISTS sync_workflow_from_status_trigger ON orders;
CREATE TRIGGER sync_workflow_from_status_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION sync_workflow_from_order_status();