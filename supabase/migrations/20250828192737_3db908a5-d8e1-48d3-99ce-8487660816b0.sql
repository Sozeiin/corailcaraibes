-- Phase 1: Nettoyer les tables complexes de workflow
DROP TABLE IF EXISTS public.purchase_workflow_steps CASCADE;
DROP TABLE IF EXISTS public.workflow_notifications CASCADE;
DROP TABLE IF EXISTS public.workflow_alerts CASCADE;
DROP TABLE IF EXISTS public.workflow_automation_rules CASCADE;
DROP TABLE IF EXISTS public.purchasing_workflows CASCADE;

-- Phase 2: Créer la nouvelle table supply_requests (demandes d'approvisionnement)
CREATE TABLE public.supply_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_number TEXT NOT NULL UNIQUE,
  requested_by UUID NOT NULL,
  base_id UUID NOT NULL,
  boat_id UUID,
  
  -- Informations article
  item_name TEXT NOT NULL,
  item_reference TEXT,
  description TEXT,
  quantity_needed INTEGER NOT NULL DEFAULT 1,
  urgency_level TEXT NOT NULL DEFAULT 'normal' CHECK (urgency_level IN ('low', 'normal', 'high', 'urgent')),
  photo_url TEXT,
  
  -- Workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'ordered', 'shipped', 'received', 'completed', 'rejected')),
  
  -- Validation
  validated_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID,
  rejection_reason TEXT,
  
  -- Commande
  purchase_price NUMERIC(10,2),
  supplier_name TEXT,
  
  -- Expédition
  tracking_number TEXT,
  carrier TEXT,
  shipped_at TIMESTAMP WITH TIME ZONE,
  
  -- Finalisation
  completed_at TIMESTAMP WITH TIME ZONE,
  stock_item_id UUID, -- Lien vers l'article de stock créé/mis à jour
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supply_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view supply requests for their base or if they requested it"
ON public.supply_requests
FOR SELECT
USING (
  get_user_role() = 'direction'
  OR base_id = get_user_base_id()
  OR requested_by = auth.uid()
);

CREATE POLICY "Chef_base can create supply requests"
ON public.supply_requests
FOR INSERT
WITH CHECK (
  get_user_role() IN ('chef_base', 'direction')
  AND base_id = get_user_base_id()
  AND requested_by = auth.uid()
);

CREATE POLICY "Direction can update supply requests"
ON public.supply_requests
FOR UPDATE
USING (get_user_role() = 'direction');

CREATE POLICY "Chef_base can update their own pending requests"
ON public.supply_requests
FOR UPDATE
USING (
  get_user_role() = 'chef_base'
  AND requested_by = auth.uid()
  AND status = 'pending'
);

-- Créer une séquence pour les numéros de demande
CREATE SEQUENCE IF NOT EXISTS public.supply_request_number_seq START 1;

-- Fonction pour générer les numéros de demande
CREATE OR REPLACE FUNCTION public.generate_supply_request_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  next_val INTEGER;
  new_number TEXT;
BEGIN
  SELECT nextval('public.supply_request_number_seq') INTO next_val;
  new_number := 'APP-' || LPAD(next_val::TEXT, 6, '0');
  RETURN new_number;
END;
$$;

-- Trigger pour auto-générer les numéros de demande
CREATE OR REPLACE FUNCTION public.auto_generate_supply_request_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
    NEW.request_number := public.generate_supply_request_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_supply_request_number
  BEFORE INSERT ON public.supply_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_supply_request_number();

-- Trigger pour updated_at
CREATE TRIGGER update_supply_requests_updated_at
  BEFORE UPDATE ON public.supply_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour gérer la clôture automatique lors du scan
CREATE OR REPLACE FUNCTION public.handle_supply_request_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_record RECORD;
BEGIN
  -- Vérifier si c'est une augmentation de quantité (réception de stock)
  IF NEW.quantity > OLD.quantity THEN
    -- Chercher les demandes d'approvisionnement correspondantes
    FOR request_record IN 
      SELECT sr.id, sr.request_number, sr.requested_by
      FROM public.supply_requests sr
      WHERE sr.status = 'shipped'
        AND sr.base_id = NEW.base_id
        AND (
          -- Correspondance exacte par nom
          LOWER(TRIM(sr.item_name)) = LOWER(TRIM(NEW.name))
          -- Correspondance par référence si elle existe
          OR (sr.item_reference IS NOT NULL AND NEW.reference IS NOT NULL 
              AND LOWER(TRIM(sr.item_reference)) = LOWER(TRIM(NEW.reference)))
          -- Correspondance partielle pour les noms longs
          OR (LENGTH(sr.item_name) > 5 AND LENGTH(NEW.name) > 5 
              AND (LOWER(sr.item_name) LIKE '%' || LOWER(NEW.name) || '%'
                   OR LOWER(NEW.name) LIKE '%' || LOWER(sr.item_name) || '%'))
        )
    LOOP
      -- Clôturer automatiquement la demande
      UPDATE public.supply_requests
      SET 
        status = 'completed',
        completed_at = now(),
        stock_item_id = NEW.id
      WHERE id = request_record.id;
      
      -- Créer une notification pour le demandeur
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

-- Attacher le trigger à la table stock_items
CREATE TRIGGER supply_request_completion_trigger
  AFTER UPDATE ON public.stock_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_supply_request_completion();