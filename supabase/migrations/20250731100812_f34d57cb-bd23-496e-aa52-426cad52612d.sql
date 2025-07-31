-- Phase 1: CRITICAL Security Fixes

-- 1. Fix all database functions to have secure search_path
-- This prevents SQL injection and privilege escalation attacks

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER 
 SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, base_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'technicien')::public.user_role,
    COALESCE(NEW.raw_user_meta_data->>'base_id', '550e8400-e29b-41d4-a716-446655440001')::uuid
  );
  RETURN NEW;
END;
$function$;

-- Fix get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role()
 RETURNS user_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$function$;

-- Fix get_user_base_id function
CREATE OR REPLACE FUNCTION public.get_user_base_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT base_id FROM public.profiles WHERE id = auth.uid();
$function$;

-- Fix generate_stock_reference function
CREATE OR REPLACE FUNCTION public.generate_stock_reference()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
DECLARE
  next_val INTEGER;
  new_reference TEXT;
BEGIN
  -- Obtenir le prochain numéro de la séquence
  SELECT nextval('public.stock_reference_seq') INTO next_val;
  
  -- Formatter la référence avec un préfixe
  new_reference := 'STK-' || LPAD(next_val::TEXT, 6, '0');
  
  RETURN new_reference;
END;
$function$;

-- Fix generate_receipt_number function
CREATE OR REPLACE FUNCTION public.generate_receipt_number()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
DECLARE
  next_val INTEGER;
  new_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_val
  FROM public.logistics_receipts
  WHERE receipt_number LIKE 'REC-%';
  
  new_number := 'REC-' || LPAD(next_val::TEXT, 6, '0');
  RETURN new_number;
END;
$function$;

-- Fix generate_shipment_number function
CREATE OR REPLACE FUNCTION public.generate_shipment_number()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
DECLARE
  next_val INTEGER;
  new_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(shipment_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_val
  FROM public.logistics_shipments
  WHERE shipment_number LIKE 'EXP-%';
  
  new_number := 'EXP-' || LPAD(next_val::TEXT, 6, '0');
  RETURN new_number;
END;
$function$;

-- Fix auto_generate_stock_reference function
CREATE OR REPLACE FUNCTION public.auto_generate_stock_reference()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  -- Si la référence est vide ou NULL, générer automatiquement
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := public.generate_stock_reference();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix auto_generate_receipt_number function
CREATE OR REPLACE FUNCTION public.auto_generate_receipt_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
    NEW.receipt_number := public.generate_receipt_number();
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix auto_generate_shipment_number function
CREATE OR REPLACE FUNCTION public.auto_generate_shipment_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.shipment_number IS NULL OR NEW.shipment_number = '' THEN
    NEW.shipment_number := public.generate_shipment_number();
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix calculate_order_item_total function
CREATE OR REPLACE FUNCTION public.calculate_order_item_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  -- Calculate total_price as quantity * unit_price
  NEW.total_price = NEW.quantity * NEW.unit_price;
  RETURN NEW;
END;
$function$;

-- Fix calculate_intervention_part_total function
CREATE OR REPLACE FUNCTION public.calculate_intervention_part_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  NEW.total_cost = NEW.quantity * NEW.unit_cost;
  RETURN NEW;
END;
$function$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix calculate_next_maintenance_date function
CREATE OR REPLACE FUNCTION public.calculate_next_maintenance_date(last_date date, interval_value integer, interval_unit text)
 RETURNS date
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  CASE interval_unit
    WHEN 'heures' THEN RETURN last_date + (interval_value * INTERVAL '1 hour')::DATE;
    WHEN 'jours' THEN RETURN last_date + (interval_value * INTERVAL '1 day');
    WHEN 'semaines' THEN RETURN last_date + (interval_value * INTERVAL '1 week');
    WHEN 'mois' THEN RETURN last_date + (interval_value * INTERVAL '1 month');
    WHEN 'années' THEN RETURN last_date + (interval_value * INTERVAL '1 year');
    ELSE RETURN last_date + (interval_value * INTERVAL '1 month');
  END CASE;
END;
$function$;

-- Fix create_scheduled_maintenance_from_manual function
CREATE OR REPLACE FUNCTION public.create_scheduled_maintenance_from_manual()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
DECLARE
  task_record RECORD;
  next_date DATE;
BEGIN
  -- Pour chaque tâche du manuel, créer une maintenance planifiée
  FOR task_record IN 
    SELECT * FROM maintenance_manual_tasks WHERE manual_id = NEW.id
  LOOP
    -- Calculer la prochaine date de maintenance (à partir d'aujourd'hui)
    next_date := calculate_next_maintenance_date(CURRENT_DATE, task_record.interval_value, task_record.interval_unit);
    
    -- Créer la maintenance planifiée
    INSERT INTO scheduled_maintenance (
      boat_id,
      manual_task_id,
      task_name,
      scheduled_date
    ) VALUES (
      NEW.boat_id,
      task_record.id,
      task_record.task_name,
      next_date
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Fix update_stock_item_purchase_info function
CREATE OR REPLACE FUNCTION public.update_stock_item_purchase_info()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
DECLARE
  item_record RECORD;
BEGIN
  -- Only process when order status changes to 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Update stock items with latest purchase information
    FOR item_record IN 
      SELECT oi.*, si.id as stock_id
      FROM order_items oi
      JOIN stock_items si ON (
        LOWER(si.name) = LOWER(oi.product_name) AND 
        si.base_id = NEW.base_id AND
        (oi.reference IS NULL OR si.reference = oi.reference OR si.reference IS NULL)
      )
      WHERE oi.order_id = NEW.id
    LOOP
      -- Update the stock item with purchase info
      UPDATE public.stock_items 
      SET 
        last_purchase_date = NEW.delivery_date,
        last_purchase_cost = item_record.unit_price,
        last_supplier_id = NEW.supplier_id,
        last_updated = NOW()
      WHERE id = item_record.stock_id;
      
      -- Also update the order_item with the stock_item_id for future reference
      UPDATE public.order_items 
      SET stock_item_id = item_record.stock_id
      WHERE id = item_record.id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix refresh_purchasing_analytics function
CREATE OR REPLACE FUNCTION public.refresh_purchasing_analytics()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW public.purchasing_analytics;
END;
$function$;

-- Fix handle_order_delivery function
CREATE OR REPLACE FUNCTION public.handle_order_delivery()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Si le statut passe à 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Ajouter/mettre à jour les articles dans le stock en utilisant les références
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
      COALESCE(oi.reference, public.generate_stock_reference()), -- Utiliser la référence de la commande ou en générer une
      COALESCE(s.category, 'Autre'),
      oi.quantity,
      GREATEST(ROUND(oi.quantity * 0.1), 1), -- Seuil minimum = 10% de la quantité livrée (minimum 1)
      'pièce',
      'Livraison ' || NEW.order_number,
      NEW.base_id,
      NOW()
    FROM order_items oi
    LEFT JOIN suppliers s ON s.id = NEW.supplier_id
    WHERE oi.order_id = NEW.id
    ON CONFLICT (name, base_id) -- Si l'article existe déjà pour cette base
    DO UPDATE SET
      quantity = stock_items.quantity + EXCLUDED.quantity,
      last_updated = NOW(),
      -- Mettre à jour la référence si elle était vide
      reference = CASE 
        WHEN stock_items.reference IS NULL OR stock_items.reference = '' 
        THEN EXCLUDED.reference 
        ELSE stock_items.reference 
      END;
      
    -- Log de l'opération pour traçabilité
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

-- Fix handle_bulk_order_delivery function
CREATE OR REPLACE FUNCTION public.handle_bulk_order_delivery()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
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

-- Fix handle_intervention_completion function
CREATE OR REPLACE FUNCTION public.handle_intervention_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  -- Si l'intervention passe au statut 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Décrémenter le stock pour toutes les pièces utilisées dans cette intervention
    UPDATE public.stock_items 
    SET 
      quantity = stock_items.quantity - ip.quantity,
      last_updated = NOW()
    FROM public.intervention_parts ip
    WHERE stock_items.id = ip.stock_item_id 
    AND ip.intervention_id = NEW.id
    AND ip.stock_item_id IS NOT NULL;
    
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
      'Stock mis à jour automatiquement',
      'Le stock a été décrémenté suite à la finalisation de l''intervention ' || NEW.title,
      NEW.base_id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix handle_purchase_request_status_change function
CREATE OR REPLACE FUNCTION public.handle_purchase_request_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Only handle purchase requests
  IF NEW.is_purchase_request != true THEN
    RETURN NEW;
  END IF;

  -- Send notification when status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify the requester about status changes
    IF NEW.requested_by IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        data
      ) VALUES (
        NEW.requested_by,
        'purchase_request_status',
        'Demande d''achat mise à jour',
        'Le statut de votre demande d''achat ' || NEW.order_number || ' a été mis à jour.',
        jsonb_build_object(
          'order_id', NEW.id,
          'order_number', NEW.order_number,
          'old_status', OLD.status,
          'new_status', NEW.status
        )
      );
    END IF;

    -- Notify direction when new request is created
    IF NEW.status = 'pending_approval' AND OLD.status IS NULL THEN
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        data
      )
      SELECT 
        p.id,
        'purchase_request_approval',
        'Nouvelle demande d''achat',
        'Une nouvelle demande d''achat ' || NEW.order_number || ' nécessite votre approbation.',
        jsonb_build_object(
          'order_id', NEW.id,
          'order_number', NEW.order_number,
          'requested_by', NEW.requested_by
        )
      FROM public.profiles p
      WHERE p.role = 'direction';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. CRITICAL: Prevent users from updating their own roles
-- Create policy to block role updates by users themselves
CREATE POLICY "Users cannot update their own role" ON public.profiles
FOR UPDATE 
USING (
  CASE 
    WHEN auth.uid() = id THEN 
      -- Allow users to update their own record but not the role or base_id
      (get_user_role() = 'direction' OR OLD.role = NEW.role) 
      AND (get_user_role() = 'direction' OR OLD.base_id = NEW.base_id)
    ELSE 
      -- Non-self updates require direction role
      get_user_role() = 'direction'
  END
);

-- 3. Add security event logging for role changes
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  target_user_id uuid,
  details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on security_events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only direction can view security events
CREATE POLICY "Direction can view security events" ON public.security_events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'direction'
  )
);

-- System can insert security events
CREATE POLICY "System can insert security events" ON public.security_events
FOR INSERT WITH CHECK (true);

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Log role or base changes
  IF OLD.role IS DISTINCT FROM NEW.role OR OLD.base_id IS DISTINCT FROM NEW.base_id THEN
    INSERT INTO public.security_events (
      event_type,
      user_id,
      target_user_id,
      details
    ) VALUES (
      'profile_update',
      auth.uid(),
      NEW.id,
      jsonb_build_object(
        'old_role', OLD.role,
        'new_role', NEW.role,
        'old_base_id', OLD.base_id,
        'new_base_id', NEW.base_id,
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for security logging
DROP TRIGGER IF EXISTS log_profile_security_events ON public.profiles;
CREATE TRIGGER log_profile_security_events
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_security_event();