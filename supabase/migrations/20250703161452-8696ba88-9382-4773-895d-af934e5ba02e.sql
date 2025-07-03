-- First create the missing update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Extend orders table for bulk purchases
ALTER TABLE public.orders 
ADD COLUMN is_bulk_purchase BOOLEAN DEFAULT FALSE,
ADD COLUMN bulk_purchase_type TEXT, -- 'annual', 'quarterly', etc.
ADD COLUMN expected_delivery_date DATE,
ADD COLUMN distribution_status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
ADD COLUMN notes TEXT;

-- Create bulk_purchase_distributions table to track how items are distributed between bases
CREATE TABLE public.bulk_purchase_distributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  base_id UUID NOT NULL REFERENCES public.bases(id) ON DELETE CASCADE,
  allocated_quantity INTEGER NOT NULL DEFAULT 0,
  received_quantity INTEGER NOT NULL DEFAULT 0,
  distribution_date DATE,
  status TEXT DEFAULT 'allocated', -- 'allocated', 'received', 'distributed'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on bulk_purchase_distributions
ALTER TABLE public.bulk_purchase_distributions ENABLE ROW LEVEL SECURITY;

-- Create policies for bulk_purchase_distributions
CREATE POLICY "Direction and chef_base can manage distributions" 
ON public.bulk_purchase_distributions 
FOR ALL 
USING (
  (get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role])) 
  AND (
    get_user_role() = 'direction'::user_role 
    OR base_id = get_user_base_id()
    OR EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = bulk_purchase_distributions.order_id 
      AND o.base_id = get_user_base_id()
    )
  )
);

CREATE POLICY "Users can view distributions" 
ON public.bulk_purchase_distributions 
FOR SELECT 
USING (
  get_user_role() = 'direction'::user_role 
  OR base_id = get_user_base_id()
  OR EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = bulk_purchase_distributions.order_id 
    AND o.base_id = get_user_base_id()
  )
);

-- Create trigger for automatic timestamp updates on distributions
CREATE TRIGGER update_bulk_distributions_updated_at
BEFORE UPDATE ON public.bulk_purchase_distributions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for bulk purchase templates (for recurring annual orders)
CREATE TABLE public.bulk_purchase_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  frequency TEXT DEFAULT 'annual', -- 'annual', 'quarterly', 'monthly'
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on bulk_purchase_templates
ALTER TABLE public.bulk_purchase_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for bulk_purchase_templates
CREATE POLICY "Direction and chef_base can manage templates" 
ON public.bulk_purchase_templates 
FOR ALL 
USING (get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role]));

CREATE POLICY "Users can view templates" 
ON public.bulk_purchase_templates 
FOR SELECT 
USING (true);

-- Create template items table
CREATE TABLE public.bulk_purchase_template_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.bulk_purchase_templates(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  estimated_quantity INTEGER NOT NULL DEFAULT 0,
  estimated_unit_price NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on bulk_purchase_template_items
ALTER TABLE public.bulk_purchase_template_items ENABLE ROW LEVEL SECURITY;

-- Create policies for bulk_purchase_template_items
CREATE POLICY "Direction and chef_base can manage template items" 
ON public.bulk_purchase_template_items 
FOR ALL 
USING (get_user_role() = ANY (ARRAY['direction'::user_role, 'chef_base'::user_role]));

CREATE POLICY "Users can view template items" 
ON public.bulk_purchase_template_items 
FOR SELECT 
USING (true);

-- Add trigger for bulk_purchase_templates updated_at
CREATE TRIGGER update_bulk_templates_updated_at
BEFORE UPDATE ON public.bulk_purchase_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update the handle_order_delivery function to handle bulk purchases
CREATE OR REPLACE FUNCTION public.handle_bulk_order_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Si le statut passe à 'delivered' et que c'est un achat en gros
  IF NEW.status = 'delivered' AND NEW.is_bulk_purchase = true AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
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
    LEFT JOIN bulk_purchase_distributions bd ON bd.order_item_id = oi.id
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
      'Stock mis à jour - Achat groupé',
      'Les articles de l''achat groupé ' || NEW.order_number || ' ont été distribués et ajoutés aux stocks des bases.',
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

-- Drop the old trigger and create new one
DROP TRIGGER IF EXISTS handle_order_delivery_trigger ON public.orders;
CREATE TRIGGER handle_bulk_order_delivery_trigger
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_bulk_order_delivery();