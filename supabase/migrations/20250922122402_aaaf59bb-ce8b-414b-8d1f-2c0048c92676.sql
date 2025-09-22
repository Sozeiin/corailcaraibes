-- Créer la table pour les mouvements de stock
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_item_id UUID NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out')),
  quantity INTEGER NOT NULL,
  supplier_id UUID,
  user_id UUID NOT NULL,
  base_id UUID NOT NULL,
  movement_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  reference_type TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer les index pour améliorer les performances
CREATE INDEX idx_stock_movements_stock_item ON public.stock_movements(stock_item_id);
CREATE INDEX idx_stock_movements_supplier ON public.stock_movements(supplier_id);
CREATE INDEX idx_stock_movements_base ON public.stock_movements(base_id);
CREATE INDEX idx_stock_movements_date ON public.stock_movements(movement_date);

-- Ajouter la fonction de mise à jour automatique du timestamp
CREATE TRIGGER update_stock_movements_updated_at
BEFORE UPDATE ON public.stock_movements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Activer RLS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Politique RLS pour les utilisateurs - peuvent voir les mouvements de leur base
CREATE POLICY "Users can view stock movements for their base" 
ON public.stock_movements 
FOR SELECT 
USING (
  get_user_role() = 'direction' OR 
  base_id = get_user_base_id()
);

-- Politique RLS pour la création - seuls direction et chef_base peuvent créer
CREATE POLICY "Direction and chef_base can create stock movements" 
ON public.stock_movements 
FOR INSERT 
WITH CHECK (
  get_user_role() = ANY(ARRAY['direction', 'chef_base']) AND
  (get_user_role() = 'direction' OR base_id = get_user_base_id()) AND
  user_id = auth.uid()
);

-- Politique RLS pour la modification - seuls direction et chef_base peuvent modifier
CREATE POLICY "Direction and chef_base can update stock movements" 
ON public.stock_movements 
FOR UPDATE 
USING (
  get_user_role() = ANY(ARRAY['direction', 'chef_base']) AND
  (get_user_role() = 'direction' OR base_id = get_user_base_id())
);

-- Politique RLS pour la suppression - seule la direction peut supprimer
CREATE POLICY "Direction can delete stock movements" 
ON public.stock_movements 
FOR DELETE 
USING (get_user_role() = 'direction');