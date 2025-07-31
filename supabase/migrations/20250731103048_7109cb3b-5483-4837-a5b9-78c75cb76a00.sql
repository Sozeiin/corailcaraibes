-- Phase 1 Final: Complete role security and remaining function fixes

-- Fix remaining functions with search_path
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
      COALESCE(oi.reference, public.generate_stock_reference()),
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
      last_updated = NOW(),
      reference = CASE 
        WHEN stock_items.reference IS NULL OR stock_items.reference = '' 
        THEN EXCLUDED.reference 
        ELSE stock_items.reference 
      END;
      
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
  IF NEW.status = 'delivered' AND NEW.is_bulk_purchase = true AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    IF EXISTS (SELECT 1 FROM bulk_purchase_distributions WHERE order_id = NEW.id AND received_quantity > 0) THEN
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
        
      UPDATE public.bulk_purchase_distributions 
      SET status = 'distributed'
      WHERE order_id = NEW.id AND received_quantity > 0;
    END IF;
    
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
  ELSIF NEW.status = 'delivered' AND (NEW.is_bulk_purchase IS NULL OR NEW.is_bulk_purchase = false) AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
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
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.stock_items 
    SET 
      quantity = stock_items.quantity - ip.quantity,
      last_updated = NOW()
    FROM public.intervention_parts ip
    WHERE stock_items.id = ip.stock_item_id 
    AND ip.intervention_id = NEW.id
    AND ip.stock_item_id IS NOT NULL;
    
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
  IF NEW.is_purchase_request != true THEN
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
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

-- CRITICAL: Secure role management
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users cannot update their own role" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile safely" ON public.profiles;

-- Create secure policy that prevents role/base_id escalation
CREATE POLICY "Users can update own profile safely" ON public.profiles
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND (
    -- Only direction can update roles and base_id
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'direction' 
    OR (
      -- Regular users can only update name and email, NOT role or base_id
      role = (SELECT role FROM public.profiles WHERE id = auth.uid())
      AND base_id = (SELECT base_id FROM public.profiles WHERE id = auth.uid())
    )
  )
);

-- Add security event logging table if not exists
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

-- Drop existing policies on security_events if they exist
DROP POLICY IF EXISTS "Direction can view security events" ON public.security_events;
DROP POLICY IF EXISTS "System can insert security events" ON public.security_events;

-- Recreate security event policies
CREATE POLICY "Direction can view security events" ON public.security_events
FOR SELECT 
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'direction'
);

CREATE POLICY "System can insert security events" ON public.security_events
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Log role or base changes
  IF (OLD.role IS DISTINCT FROM NEW.role) OR (OLD.base_id IS DISTINCT FROM NEW.base_id) THEN
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