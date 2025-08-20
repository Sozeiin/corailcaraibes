-- Créer une table pour l'historique d'achat du stock général
CREATE TABLE IF NOT EXISTS public.stock_purchase_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id),
  order_item_id UUID REFERENCES public.order_items(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_cost NUMERIC GENERATED ALWAYS AS (unit_cost * quantity) STORED,
  warranty_months INTEGER DEFAULT 0,
  invoice_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activer RLS sur la nouvelle table
ALTER TABLE public.stock_purchase_history ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux utilisateurs de voir l'historique de leur base
CREATE POLICY "Users can view stock purchase history for their base"
ON public.stock_purchase_history
FOR SELECT
USING (
  get_user_role() = 'direction' OR
  EXISTS (
    SELECT 1 FROM public.stock_items si
    WHERE si.id = stock_purchase_history.stock_item_id
    AND si.base_id = get_user_base_id()
  )
);

-- Politique pour permettre aux chefs de base et direction de gérer l'historique
CREATE POLICY "Direction and chef_base can manage stock purchase history"
ON public.stock_purchase_history
FOR ALL
USING (
  get_user_role() IN ('direction', 'chef_base') AND (
    get_user_role() = 'direction' OR
    EXISTS (
      SELECT 1 FROM public.stock_items si
      WHERE si.id = stock_purchase_history.stock_item_id
      AND si.base_id = get_user_base_id()
    )
  )
);

-- Trigger pour auto-update du updated_at
CREATE TRIGGER update_stock_purchase_history_updated_at
BEFORE UPDATE ON public.stock_purchase_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Nouvelle fonction qui utilise la bonne table d'historique
CREATE OR REPLACE FUNCTION public.add_order_items_to_stock(
  order_id_param UUID,
  selected_items JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_record RECORD;
  item_record RECORD;
  stock_item_record RECORD;
  added_items JSONB := '[]'::JSONB;
  errors JSONB := '[]'::JSONB;
  new_stock_item_id UUID;
BEGIN
  RAISE NOTICE 'DEBUT: order_id=%, selected_items=%', order_id_param, selected_items;
  
  -- Récupérer la commande
  SELECT * INTO order_record FROM public.orders WHERE id = order_id_param;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'ERREUR: Commande non trouvée';
    RETURN jsonb_build_object('error', 'Commande non trouvée', 'success', false);
  END IF;
  
  RAISE NOTICE 'COMMANDE TROUVEE: %, base_id=%', order_record.order_number, order_record.base_id;
  
  -- Traiter chaque article sélectionné
  FOR item_record IN 
    SELECT oi.* FROM public.order_items oi 
    WHERE oi.order_id = order_id_param
    AND (selected_items IS NULL OR oi.id::text = ANY(SELECT jsonb_array_elements_text(selected_items)))
  LOOP
    BEGIN
      RAISE NOTICE 'TRAITEMENT ARTICLE: % (quantity=%, unit_price=%)', item_record.product_name, item_record.quantity, item_record.unit_price;
      
      -- Chercher dans le stock existant
      SELECT * INTO stock_item_record 
      FROM public.stock_items 
      WHERE base_id = order_record.base_id 
      AND LOWER(TRIM(name)) = LOWER(TRIM(item_record.product_name))
      LIMIT 1;
      
      IF FOUND THEN
        RAISE NOTICE 'STOCK EXISTANT TROUVE: %', stock_item_record.name;
        -- Mettre à jour le stock existant
        UPDATE public.stock_items 
        SET quantity = quantity + item_record.quantity, last_updated = NOW()
        WHERE id = stock_item_record.id;
        new_stock_item_id := stock_item_record.id;
      ELSE
        RAISE NOTICE 'CREATION NOUVEAU STOCK: %', item_record.product_name;
        -- Créer nouvel article de stock
        INSERT INTO public.stock_items (
          name, reference, category, quantity, min_threshold, unit, location, base_id, last_updated
        ) VALUES (
          TRIM(item_record.product_name), 
          item_record.reference,
          'Autre', 
          item_record.quantity, 
          1, 
          'pièce', 
          'Commande ' || order_record.order_number, 
          order_record.base_id, 
          NOW()
        ) RETURNING id INTO new_stock_item_id;
      END IF;
      
      RAISE NOTICE 'STOCK ITEM ID: %', new_stock_item_id;
      
      -- Créer l'historique d'achat dans la bonne table
      INSERT INTO public.stock_purchase_history (
        stock_item_id,
        order_id,
        order_item_id,
        supplier_id,
        purchase_date,
        unit_cost,
        quantity,
        invoice_reference,
        notes
      ) VALUES (
        new_stock_item_id,
        order_record.id,
        item_record.id,
        order_record.supplier_id,
        COALESCE(order_record.delivery_date, CURRENT_DATE),
        item_record.unit_price,
        item_record.quantity,
        order_record.order_number,
        'Ajout automatique depuis commande ' || order_record.order_number
      );
      
      RAISE NOTICE 'HISTORIQUE CREE AVEC SUCCES';
      
      added_items := added_items || jsonb_build_object(
        'item_name', item_record.product_name,
        'quantity', item_record.quantity,
        'stock_item_id', new_stock_item_id,
        'unit_cost', item_record.unit_price
      );
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'ERREUR ARTICLE %: % (SQLSTATE: %)', item_record.product_name, SQLERRM, SQLSTATE;
      errors := errors || jsonb_build_object(
        'item_name', item_record.product_name,
        'error', SQLERRM,
        'sqlstate', SQLSTATE
      );
    END;
  END LOOP;
  
  RAISE NOTICE 'FIN: % ajouts, % erreurs', jsonb_array_length(added_items), jsonb_array_length(errors);
  
  RETURN jsonb_build_object(
    'added_items', added_items,
    'errors', errors,
    'success', TRUE
  );
END;
$$;