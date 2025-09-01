CREATE OR REPLACE FUNCTION public.handle_supply_request_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_record RECORD;
  supplier_id uuid;
  quantity_added integer;
BEGIN
  -- Determine quantity added during the scan
  quantity_added := NEW.quantity - OLD.quantity;

  -- Only process if quantity increased
  IF quantity_added > 0 THEN
    FOR request_record IN
      SELECT sr.*, s.id AS supplier_id
      FROM public.supply_requests sr
      LEFT JOIN public.suppliers s ON s.name = sr.supplier_name AND s.base_id = sr.base_id
      WHERE sr.status = 'shipped'
        AND sr.base_id = NEW.base_id
        AND (
          LOWER(TRIM(sr.item_name)) = LOWER(TRIM(NEW.name))
          OR (sr.item_reference IS NOT NULL AND NEW.reference IS NOT NULL
              AND LOWER(TRIM(sr.item_reference)) = LOWER(TRIM(NEW.reference)))
          OR (LENGTH(sr.item_name) > 5 AND LENGTH(NEW.name) > 5
              AND (LOWER(sr.item_name) LIKE '%' || LOWER(NEW.name) || '%'
                   OR LOWER(NEW.name) LIKE '%' || LOWER(sr.item_name) || '%'))
        )
    LOOP
      -- Ensure supplier exists for the base
      IF request_record.supplier_name IS NOT NULL AND request_record.supplier_id IS NULL THEN
        INSERT INTO public.suppliers (name, base_id)
        VALUES (request_record.supplier_name, request_record.base_id)
        RETURNING id INTO supplier_id;
      ELSE
        supplier_id := request_record.supplier_id;
      END IF;

      -- Mark request as completed and link stock item
      UPDATE public.supply_requests
      SET
        status = 'completed',
        completed_at = now(),
        stock_item_id = NEW.id,
        updated_at = now()
      WHERE id = request_record.id;

      -- Record purchase history with supplier and price
      BEGIN
        INSERT INTO public.component_purchase_history (
          stock_item_id,
          supplier_id,
          purchase_date,
          unit_cost,
          quantity,
          warranty_months,
          notes
        ) VALUES (
          NEW.id,
          supplier_id,
          CURRENT_DATE,
          COALESCE(request_record.purchase_price, 0),
          quantity_added,
          12,
          'Reçu via scan - Demande: ' || request_record.request_number
        );
      EXCEPTION
        WHEN OTHERS THEN
          INSERT INTO public.security_events (
            event_type,
            user_id,
            details
          ) VALUES (
            'supply_request_purchase_history_error',
            auth.uid(),
            jsonb_build_object(
              'error', SQLERRM,
              'stock_item_id', NEW.id,
              'request_id', request_record.id
            )
          );
      END;

      -- Notify the requester
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        data
      ) VALUES (
        request_record.requested_by,
        'supply_request_completed',
        '✅ Demande d''approvisionnement terminée',
        'Votre demande ' || request_record.request_number || ' a été automatiquement clôturée suite à la réception en stock.',
        jsonb_build_object(
          'request_id', request_record.id,
          'request_number', request_record.request_number,
          'stock_item_id', NEW.id
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger uses the updated function
DROP TRIGGER IF EXISTS supply_request_completion_trigger ON public.stock_items;
CREATE TRIGGER supply_request_completion_trigger
  AFTER UPDATE ON public.stock_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_supply_request_completion();
