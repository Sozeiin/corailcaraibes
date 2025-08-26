-- Ensure component_purchase_history table structure is correct for stock scan workflow
-- This migration ensures the total_cost column handling is properly configured

-- Verify that total_cost is indeed a generated column (if not, make it one)
DO $$
BEGIN
    -- Check if total_cost exists and is generated
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'component_purchase_history' 
        AND column_name = 'total_cost' 
        AND is_generated = 'ALWAYS'
    ) THEN
        -- If column exists but is not generated, drop and recreate it
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'component_purchase_history' 
            AND column_name = 'total_cost'
        ) THEN
            ALTER TABLE public.component_purchase_history 
            DROP COLUMN IF EXISTS total_cost;
        END IF;
        
        -- Add total_cost as a generated column
        ALTER TABLE public.component_purchase_history 
        ADD COLUMN total_cost DECIMAL(10,2) GENERATED ALWAYS AS (unit_cost * quantity) STORED;
    END IF;
END $$;

-- Create or replace the stock scan workflow function with proper error handling
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

      -- Créer l'historique d'achat automatiquement (SANS total_cost - colonne générée)
      -- Only insert if we have valid data and avoid duplicate entries
      IF order_item_record.id IS NOT NULL AND order_item_record.unit_price > 0 THEN
        BEGIN
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
        EXCEPTION
          WHEN unique_violation THEN
            -- Skip if already exists
            NULL;
          WHEN OTHERS THEN
            -- Log error but don't fail the entire operation
            INSERT INTO public.security_events (
              event_type,
              user_id,
              details
            ) VALUES (
              'stock_scan_purchase_history_error',
              auth.uid(),
              jsonb_build_object(
                'error', SQLERRM,
                'stock_item_id', NEW.id,
                'order_id', order_record.id,
                'timestamp', now()
              )
            );
        END;
      END IF;

      -- Continue with workflow advancement...
      PERFORM public.advance_workflow_step(
        order_record.id,
        'received_scanned'::public.purchase_workflow_status,
        auth.uid(),
        'Réception automatique via scan de stock - Article: ' || NEW.name || ' - Quantité ajoutée: ' || (NEW.quantity - OLD.quantity)
      );
      
      PERFORM public.advance_workflow_step(
        order_record.id,
        'completed'::public.purchase_workflow_status,
        auth.uid(),
        'Demande d''achat terminée automatiquement suite au scan de réception'
      );
      
      matched_count := matched_count + 1;
      
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;