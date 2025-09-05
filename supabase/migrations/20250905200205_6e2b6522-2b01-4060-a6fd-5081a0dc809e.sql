-- Migration: Distribution inter-bases module
-- Tables pour la gestion des expéditions entre bases

-- Table des expéditions
CREATE TABLE public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT auth.uid(),
  source_base_id UUID NOT NULL REFERENCES public.bases(id),
  destination_base_id UUID NOT NULL REFERENCES public.bases(id),
  carrier TEXT,
  tracking_number TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','packed','shipped','received','received_with_discrepancy','reconciled')),
  notes TEXT,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table des colis dans une expédition
CREATE TABLE public.shipment_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT auth.uid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  package_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, shipment_id, package_code)
);

-- Table des articles dans une expédition
CREATE TABLE public.shipment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT auth.uid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.shipment_packages(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  product_label TEXT,
  qty NUMERIC(12,3) NOT NULL DEFAULT 1,
  received_qty NUMERIC(12,3) NOT NULL DEFAULT 0,
  source_base_id UUID NOT NULL,
  destination_base_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table des mouvements de stock pour audit
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT auth.uid(),
  ts TIMESTAMPTZ DEFAULT now(),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('outbound_distribution','inbound_distribution')),
  base_id UUID NOT NULL REFERENCES public.bases(id),
  sku TEXT NOT NULL,
  qty NUMERIC(12,3) NOT NULL,
  shipment_id UUID REFERENCES public.shipments(id),
  package_id UUID REFERENCES public.shipment_packages(id),
  scan_event_id UUID,
  actor UUID NOT NULL DEFAULT auth.uid(),
  notes TEXT
);

-- Index unique pour l'idempotence
CREATE UNIQUE INDEX idx_stock_movements_idempotence ON public.stock_movements(tenant_id, scan_event_id) WHERE scan_event_id IS NOT NULL;

-- Trigger pour updated_at
CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies pour shipments
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Direction can manage all shipments" 
ON public.shipments FOR ALL 
USING (get_user_role() = 'direction'::user_role)
WITH CHECK (get_user_role() = 'direction'::user_role);

CREATE POLICY "Chef_base can manage shipments for their bases" 
ON public.shipments FOR ALL 
USING (
  get_user_role() = 'chef_base'::user_role AND 
  (source_base_id = get_user_base_id() OR destination_base_id = get_user_base_id())
)
WITH CHECK (
  get_user_role() = 'chef_base'::user_role AND 
  (source_base_id = get_user_base_id() OR destination_base_id = get_user_base_id())
);

CREATE POLICY "Users can view shipments for their bases" 
ON public.shipments FOR SELECT 
USING (
  get_user_role() = 'direction'::user_role OR 
  source_base_id = get_user_base_id() OR 
  destination_base_id = get_user_base_id()
);

-- RLS Policies pour shipment_packages
ALTER TABLE public.shipment_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage packages for accessible shipments" 
ON public.shipment_packages FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.shipments s 
    WHERE s.id = shipment_packages.shipment_id 
    AND (
      get_user_role() = 'direction'::user_role OR 
      s.source_base_id = get_user_base_id() OR 
      s.destination_base_id = get_user_base_id()
    )
  )
);

-- RLS Policies pour shipment_items
ALTER TABLE public.shipment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage items for accessible shipments" 
ON public.shipment_items FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.shipments s 
    WHERE s.id = shipment_items.shipment_id 
    AND (
      get_user_role() = 'direction'::user_role OR 
      s.source_base_id = get_user_base_id() OR 
      s.destination_base_id = get_user_base_id()
    )
  )
);

-- RLS Policies pour stock_movements
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Direction can view all stock movements" 
ON public.stock_movements FOR SELECT 
USING (get_user_role() = 'direction'::user_role);

CREATE POLICY "Users can view movements for their base" 
ON public.stock_movements FOR SELECT 
USING (base_id = get_user_base_id());

CREATE POLICY "Users can create movements for their base" 
ON public.stock_movements FOR INSERT 
WITH CHECK (base_id = get_user_base_id());

-- RPC Functions

-- Créer une expédition
CREATE OR REPLACE FUNCTION public.create_shipment(
  p_source_base_id UUID,
  p_destination_base_id UUID,
  p_carrier TEXT DEFAULT NULL,
  p_tracking_number TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shipment_id UUID;
BEGIN
  -- Vérifier les permissions
  IF get_user_role() NOT IN ('direction', 'chef_base') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  
  IF get_user_role() = 'chef_base' AND p_source_base_id != get_user_base_id() THEN
    RAISE EXCEPTION 'Cannot create shipment from different base';
  END IF;
  
  INSERT INTO public.shipments (
    source_base_id, destination_base_id, carrier, tracking_number, notes
  ) VALUES (
    p_source_base_id, p_destination_base_id, p_carrier, p_tracking_number, p_notes
  ) RETURNING id INTO v_shipment_id;
  
  RETURN v_shipment_id;
END;
$$;

-- Ajouter un article via scan
CREATE OR REPLACE FUNCTION public.add_item_by_scan(
  p_shipment_id UUID,
  p_sku TEXT,
  p_qty NUMERIC DEFAULT 1,
  p_package_code TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shipment RECORD;
  v_package_id UUID;
  v_current_stock NUMERIC;
  v_item_id UUID;
  v_stock_item RECORD;
BEGIN
  -- Récupérer l'expédition
  SELECT * INTO v_shipment FROM public.shipments WHERE id = p_shipment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shipment not found';
  END IF;
  
  IF v_shipment.status != 'draft' THEN
    RAISE EXCEPTION 'Cannot add items to non-draft shipment';
  END IF;
  
  -- Vérifier le stock disponible
  SELECT si.*, si.quantity INTO v_stock_item
  FROM public.stock_items si 
  WHERE si.reference = p_sku AND si.base_id = v_shipment.source_base_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product % not found in source base stock', p_sku;
  END IF;
  
  IF v_stock_item.quantity < p_qty THEN
    RAISE EXCEPTION 'Insufficient stock: available %, requested %', v_stock_item.quantity, p_qty;
  END IF;
  
  -- Créer/récupérer le package si code fourni
  IF p_package_code IS NOT NULL THEN
    INSERT INTO public.shipment_packages (shipment_id, package_code)
    VALUES (p_shipment_id, p_package_code)
    ON CONFLICT (tenant_id, shipment_id, package_code) 
    DO UPDATE SET package_code = EXCLUDED.package_code
    RETURNING id INTO v_package_id;
  END IF;
  
  -- Ajouter/mettre à jour l'article
  INSERT INTO public.shipment_items (
    shipment_id, package_id, sku, product_label, qty, 
    source_base_id, destination_base_id
  ) VALUES (
    p_shipment_id, v_package_id, p_sku, v_stock_item.name, p_qty,
    v_shipment.source_base_id, v_shipment.destination_base_id
  )
  ON CONFLICT (shipment_id, sku, package_id)
  DO UPDATE SET qty = shipment_items.qty + EXCLUDED.qty
  RETURNING id INTO v_item_id;
  
  RETURN v_item_id;
END;
$$;

-- Fermer le colis (pack_shipment)
CREATE OR REPLACE FUNCTION public.pack_shipment(p_shipment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_count INTEGER;
BEGIN
  -- Vérifier qu'il y a des articles
  SELECT COUNT(*) INTO v_item_count 
  FROM public.shipment_items 
  WHERE shipment_id = p_shipment_id;
  
  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Cannot pack shipment with no items';
  END IF;
  
  -- Mettre à jour le statut
  UPDATE public.shipments 
  SET status = 'packed', updated_at = now()
  WHERE id = p_shipment_id AND status = 'draft';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shipment not found or not in draft status';
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Marquer comme expédié
CREATE OR REPLACE FUNCTION public.mark_shipped(p_shipment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shipment RECORD;
  v_item RECORD;
BEGIN
  -- Récupérer l'expédition
  SELECT * INTO v_shipment FROM public.shipments WHERE id = p_shipment_id;
  
  IF NOT FOUND OR v_shipment.status != 'packed' THEN
    RAISE EXCEPTION 'Shipment not found or not ready for shipping';
  END IF;
  
  -- Créer les mouvements de sortie de stock
  FOR v_item IN 
    SELECT * FROM public.shipment_items WHERE shipment_id = p_shipment_id
  LOOP
    -- Sortie du stock source
    INSERT INTO public.stock_movements (
      movement_type, base_id, sku, qty, shipment_id, package_id
    ) VALUES (
      'outbound_distribution', v_item.source_base_id, v_item.sku, 
      -v_item.qty, p_shipment_id, v_item.package_id
    );
    
    -- Décrémenter le stock
    UPDATE public.stock_items 
    SET quantity = quantity - v_item.qty,
        last_updated = now()
    WHERE reference = v_item.sku AND base_id = v_item.source_base_id;
  END LOOP;
  
  -- Mettre à jour le statut
  UPDATE public.shipments 
  SET status = 'shipped', updated_at = now()
  WHERE id = p_shipment_id;
  
  RETURN TRUE;
END;
$$;

-- Réception par scan (idempotent)
CREATE OR REPLACE FUNCTION public.receive_scan(
  p_shipment_id UUID,
  p_sku TEXT,
  p_qty NUMERIC,
  p_package_code TEXT DEFAULT NULL,
  p_scan_event_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shipment RECORD;
  v_item RECORD;
  v_movement_id UUID;
  v_package_id UUID;
BEGIN
  -- Récupérer l'expédition
  SELECT * INTO v_shipment FROM public.shipments WHERE id = p_shipment_id;
  
  IF NOT FOUND OR v_shipment.status NOT IN ('shipped', 'received', 'received_with_discrepancy') THEN
    RAISE EXCEPTION 'Shipment not available for reception';
  END IF;
  
  -- Vérifier l'idempotence
  IF p_scan_event_id IS NOT NULL THEN
    SELECT id INTO v_movement_id FROM public.stock_movements 
    WHERE scan_event_id = p_scan_event_id;
    
    IF FOUND THEN
      RETURN v_movement_id; -- Déjà traité
    END IF;
  END IF;
  
  -- Récupérer l'article attendu
  SELECT si.*, sp.id as package_id INTO v_item 
  FROM public.shipment_items si
  LEFT JOIN public.shipment_packages sp ON sp.id = si.package_id
  WHERE si.shipment_id = p_shipment_id AND si.sku = p_sku
  AND (p_package_code IS NULL OR sp.package_code = p_package_code);
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item % not found in shipment', p_sku;
  END IF;
  
  -- Créer le mouvement d'entrée
  INSERT INTO public.stock_movements (
    movement_type, base_id, sku, qty, shipment_id, package_id, scan_event_id
  ) VALUES (
    'inbound_distribution', v_shipment.destination_base_id, p_sku, 
    p_qty, p_shipment_id, v_item.package_id, p_scan_event_id
  ) RETURNING id INTO v_movement_id;
  
  -- Mettre à jour le stock destination
  INSERT INTO public.stock_items (
    reference, name, quantity, base_id, unit, category, last_updated
  ) VALUES (
    p_sku, v_item.product_label, p_qty, v_shipment.destination_base_id, 
    'pièce', 'Distribution', now()
  )
  ON CONFLICT (reference, base_id)
  DO UPDATE SET 
    quantity = stock_items.quantity + EXCLUDED.quantity,
    last_updated = now();
  
  -- Mettre à jour la quantité reçue
  UPDATE public.shipment_items 
  SET received_qty = received_qty + p_qty
  WHERE id = v_item.id;
  
  RETURN v_movement_id;
END;
$$;

-- Réconcilier l'expédition
CREATE OR REPLACE FUNCTION public.reconcile_shipment(p_shipment_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_expected NUMERIC;
  v_total_received NUMERIC;
  v_new_status TEXT;
BEGIN
  -- Calculer les totaux
  SELECT 
    SUM(qty) as expected,
    SUM(received_qty) as received
  INTO v_total_expected, v_total_received
  FROM public.shipment_items 
  WHERE shipment_id = p_shipment_id;
  
  -- Déterminer le nouveau statut
  IF v_total_received >= v_total_expected THEN
    v_new_status := 'reconciled';
  ELSE
    v_new_status := 'received_with_discrepancy';
  END IF;
  
  -- Mettre à jour le statut
  UPDATE public.shipments 
  SET status = v_new_status, updated_at = now()
  WHERE id = p_shipment_id;
  
  RETURN v_new_status;
END;
$$;