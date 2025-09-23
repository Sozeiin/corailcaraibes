-- Créer les tables pour les préparations d'expéditions
CREATE TABLE public.shipment_preparations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  source_base_id UUID NOT NULL REFERENCES public.bases(id),
  destination_base_id UUID NOT NULL REFERENCES public.bases(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'closed', 'shipped', 'completed')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  total_boxes INTEGER NOT NULL DEFAULT 0,
  total_items INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

-- Activer RLS sur la table shipment_preparations
ALTER TABLE public.shipment_preparations ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS pour shipment_preparations
CREATE POLICY "Direction can manage all shipment preparations" 
ON public.shipment_preparations 
FOR ALL 
USING (get_user_role() = 'direction');

CREATE POLICY "Users can manage preparations for their base" 
ON public.shipment_preparations 
FOR ALL 
USING (
  get_user_role() IN ('chef_base', 'technicien') AND 
  (source_base_id = get_user_base_id() OR destination_base_id = get_user_base_id())
);

-- Créer la table des cartons
CREATE TABLE public.shipment_boxes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  preparation_id UUID NOT NULL REFERENCES public.shipment_preparations(id) ON DELETE CASCADE,
  box_identifier TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  total_items INTEGER NOT NULL DEFAULT 0,
  UNIQUE(preparation_id, box_identifier)
);

-- Activer RLS sur la table shipment_boxes
ALTER TABLE public.shipment_boxes ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS pour shipment_boxes
CREATE POLICY "Direction can manage all shipment boxes" 
ON public.shipment_boxes 
FOR ALL 
USING (get_user_role() = 'direction');

CREATE POLICY "Users can manage boxes for their base preparations" 
ON public.shipment_boxes 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.shipment_preparations sp 
    WHERE sp.id = shipment_boxes.preparation_id 
    AND (sp.source_base_id = get_user_base_id() OR sp.destination_base_id = get_user_base_id())
  )
);

-- Créer la table des articles dans les cartons
CREATE TABLE public.shipment_box_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  box_id UUID NOT NULL REFERENCES public.shipment_boxes(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id),
  item_name TEXT NOT NULL,
  item_reference TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scanned_by UUID
);

-- Activer RLS sur la table shipment_box_items
ALTER TABLE public.shipment_box_items ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS pour shipment_box_items
CREATE POLICY "Direction can manage all shipment box items" 
ON public.shipment_box_items 
FOR ALL 
USING (get_user_role() = 'direction');

CREATE POLICY "Users can manage box items for their base preparations" 
ON public.shipment_box_items 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.shipment_boxes sb
    JOIN public.shipment_preparations sp ON sp.id = sb.preparation_id
    WHERE sb.id = shipment_box_items.box_id 
    AND (sp.source_base_id = get_user_base_id() OR sp.destination_base_id = get_user_base_id())
  )
);

-- Créer un trigger pour générer automatiquement la référence
CREATE OR REPLACE FUNCTION public.generate_shipment_reference()
RETURNS TEXT AS $$
DECLARE
  next_val INTEGER;
  new_reference TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM 'EXP-(.*)') AS INTEGER)), 0) + 1
  INTO next_val
  FROM public.shipment_preparations
  WHERE reference LIKE 'EXP-%';
  
  new_reference := 'EXP-' || LPAD(next_val::TEXT, 6, '0');
  RETURN new_reference;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Créer le trigger pour auto-générer la référence
CREATE OR REPLACE FUNCTION public.auto_generate_shipment_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := public.generate_shipment_reference();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shipment_preparation_reference_trigger
  BEFORE INSERT ON public.shipment_preparations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_shipment_reference();

-- Créer un trigger pour mettre à jour les compteurs
CREATE OR REPLACE FUNCTION public.update_shipment_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'shipment_boxes' THEN
    -- Mettre à jour le nombre de cartons
    UPDATE public.shipment_preparations 
    SET total_boxes = (
      SELECT COUNT(*) FROM public.shipment_boxes 
      WHERE preparation_id = COALESCE(NEW.preparation_id, OLD.preparation_id)
    )
    WHERE id = COALESCE(NEW.preparation_id, OLD.preparation_id);
    
  ELSIF TG_TABLE_NAME = 'shipment_box_items' THEN
    -- Mettre à jour le nombre total d'articles
    UPDATE public.shipment_preparations 
    SET total_items = (
      SELECT COALESCE(SUM(sbi.quantity), 0)
      FROM public.shipment_box_items sbi
      JOIN public.shipment_boxes sb ON sb.id = sbi.box_id
      WHERE sb.preparation_id = (
        SELECT sb2.preparation_id FROM public.shipment_boxes sb2 
        WHERE sb2.id = COALESCE(NEW.box_id, OLD.box_id)
      )
    )
    WHERE id = (
      SELECT sb.preparation_id FROM public.shipment_boxes sb 
      WHERE sb.id = COALESCE(NEW.box_id, OLD.box_id)
    );
    
    -- Mettre à jour le nombre d'articles dans le carton
    UPDATE public.shipment_boxes 
    SET total_items = (
      SELECT COALESCE(SUM(quantity), 0) FROM public.shipment_box_items 
      WHERE box_id = COALESCE(NEW.box_id, OLD.box_id)
    )
    WHERE id = COALESCE(NEW.box_id, OLD.box_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_boxes_counter
  AFTER INSERT OR DELETE ON public.shipment_boxes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_shipment_counters();

CREATE TRIGGER update_items_counter
  AFTER INSERT OR DELETE ON public.shipment_box_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_shipment_counters();

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_shipment_preparations_updated_at
  BEFORE UPDATE ON public.shipment_preparations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();