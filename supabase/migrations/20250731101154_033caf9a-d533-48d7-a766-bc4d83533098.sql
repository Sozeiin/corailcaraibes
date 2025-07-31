-- Phase 1: CRITICAL Security Fixes - Fixed Version

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