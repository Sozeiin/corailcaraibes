-- Créer les tables de traçabilité logistique

-- Table pour les expéditions depuis la Métropole
CREATE TABLE public.logistics_shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_number TEXT NOT NULL UNIQUE,
  base_origin_id UUID REFERENCES public.bases(id),
  base_destination_id UUID REFERENCES public.bases(id),
  status TEXT NOT NULL DEFAULT 'preparing',
  created_by UUID REFERENCES public.profiles(id),
  prepared_by UUID REFERENCES public.profiles(id),
  shipped_date TIMESTAMP WITH TIME ZONE,
  estimated_arrival_date DATE,
  tracking_number TEXT,
  carrier TEXT,
  total_packages INTEGER DEFAULT 0,
  total_weight DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les articles dans les expéditions
CREATE TABLE public.logistics_shipment_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.logistics_shipments(id) ON DELETE CASCADE,
  stock_item_id UUID REFERENCES public.stock_items(id),
  product_name TEXT NOT NULL,
  product_reference TEXT,
  quantity_shipped INTEGER NOT NULL,
  package_number TEXT,
  scanned_at TIMESTAMP WITH TIME ZONE,
  scanned_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les réceptions dans les bases
CREATE TABLE public.logistics_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_number TEXT NOT NULL UNIQUE,
  shipment_id UUID REFERENCES public.logistics_shipments(id),
  base_id UUID NOT NULL REFERENCES public.bases(id),
  received_by UUID REFERENCES public.profiles(id),
  received_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  packages_received INTEGER DEFAULT 0,
  packages_expected INTEGER DEFAULT 0,
  condition_notes TEXT,
  discrepancies TEXT,
  validated_by UUID REFERENCES public.profiles(id),
  validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les articles reçus
CREATE TABLE public.logistics_receipt_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id UUID NOT NULL REFERENCES public.logistics_receipts(id) ON DELETE CASCADE,
  shipment_item_id UUID REFERENCES public.logistics_shipment_items(id),
  stock_item_id UUID REFERENCES public.stock_items(id),
  product_name TEXT NOT NULL,
  product_reference TEXT,
  quantity_expected INTEGER NOT NULL,
  quantity_received INTEGER NOT NULL DEFAULT 0,
  quantity_accepted INTEGER NOT NULL DEFAULT 0,
  condition TEXT DEFAULT 'good',
  scanned_at TIMESTAMP WITH TIME ZONE,
  scanned_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les performances
CREATE INDEX idx_logistics_shipments_base_origin ON public.logistics_shipments(base_origin_id);
CREATE INDEX idx_logistics_shipments_base_destination ON public.logistics_shipments(base_destination_id);
CREATE INDEX idx_logistics_shipments_status ON public.logistics_shipments(status);
CREATE INDEX idx_logistics_receipts_base ON public.logistics_receipts(base_id);
CREATE INDEX idx_logistics_receipts_shipment ON public.logistics_receipts(shipment_id);

-- RLS Policies pour logistics_shipments
ALTER TABLE public.logistics_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Direction can manage all shipments"
ON public.logistics_shipments
FOR ALL
TO authenticated
USING (get_user_role() = 'direction'::user_role)
WITH CHECK (get_user_role() = 'direction'::user_role);

CREATE POLICY "Users can view shipments for their base"
ON public.logistics_shipments
FOR SELECT
TO authenticated
USING (
  get_user_role() = 'direction'::user_role OR 
  base_origin_id = get_user_base_id() OR 
  base_destination_id = get_user_base_id()
);

-- RLS Policies pour logistics_shipment_items
ALTER TABLE public.logistics_shipment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage shipment items"
ON public.logistics_shipment_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.logistics_shipments s 
    WHERE s.id = logistics_shipment_items.shipment_id 
    AND (
      get_user_role() = 'direction'::user_role OR 
      s.base_origin_id = get_user_base_id() OR 
      s.base_destination_id = get_user_base_id()
    )
  )
);

-- RLS Policies pour logistics_receipts
ALTER TABLE public.logistics_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage receipts for their base"
ON public.logistics_receipts
FOR ALL
TO authenticated
USING (
  get_user_role() = 'direction'::user_role OR 
  base_id = get_user_base_id()
);

-- RLS Policies pour logistics_receipt_items
ALTER TABLE public.logistics_receipt_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage receipt items"
ON public.logistics_receipt_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.logistics_receipts r 
    WHERE r.id = logistics_receipt_items.receipt_id 
    AND (
      get_user_role() = 'direction'::user_role OR 
      r.base_id = get_user_base_id()
    )
  )
);

-- Fonction pour générer les numéros d'expédition
CREATE OR REPLACE FUNCTION public.generate_shipment_number()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Fonction pour générer les numéros de réception
CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger pour auto-générer les numéros d'expédition
CREATE OR REPLACE FUNCTION public.auto_generate_shipment_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.shipment_number IS NULL OR NEW.shipment_number = '' THEN
    NEW.shipment_number := public.generate_shipment_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_shipment_number
  BEFORE INSERT ON public.logistics_shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_shipment_number();

-- Trigger pour auto-générer les numéros de réception
CREATE OR REPLACE FUNCTION public.auto_generate_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
    NEW.receipt_number := public.generate_receipt_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_receipt_number
  BEFORE INSERT ON public.logistics_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_receipt_number();

-- Trigger pour mise à jour automatique updated_at
CREATE TRIGGER trigger_logistics_shipments_updated_at
  BEFORE UPDATE ON public.logistics_shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_logistics_receipts_updated_at
  BEFORE UPDATE ON public.logistics_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();