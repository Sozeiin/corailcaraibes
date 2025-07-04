-- Créer la table des locations de bateaux
CREATE TABLE public.boat_rentals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  boat_id UUID NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled')),
  notes TEXT,
  base_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Créer la table pour l'utilisation des pièces lors des interventions
CREATE TABLE public.intervention_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL,
  stock_item_id UUID,
  part_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  notes TEXT,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ajouter les contraintes de clés étrangères
ALTER TABLE public.boat_rentals 
ADD CONSTRAINT boat_rentals_boat_id_fkey 
FOREIGN KEY (boat_id) REFERENCES public.boats(id) ON DELETE CASCADE;

ALTER TABLE public.boat_rentals 
ADD CONSTRAINT boat_rentals_base_id_fkey 
FOREIGN KEY (base_id) REFERENCES public.bases(id) ON DELETE SET NULL;

ALTER TABLE public.intervention_parts 
ADD CONSTRAINT intervention_parts_intervention_id_fkey 
FOREIGN KEY (intervention_id) REFERENCES public.interventions(id) ON DELETE CASCADE;

ALTER TABLE public.intervention_parts 
ADD CONSTRAINT intervention_parts_stock_item_id_fkey 
FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id) ON DELETE SET NULL;

-- Activer RLS sur les nouvelles tables
ALTER TABLE public.boat_rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_parts ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour boat_rentals
CREATE POLICY "Users can view boat rentals" 
ON public.boat_rentals 
FOR SELECT 
USING (
  get_user_role() = 'direction'::user_role OR 
  base_id = get_user_base_id() OR
  EXISTS (
    SELECT 1 FROM boats b 
    WHERE b.id = boat_rentals.boat_id 
    AND b.base_id = get_user_base_id()
  )
);

CREATE POLICY "Direction and chef_base can manage boat rentals" 
ON public.boat_rentals 
FOR ALL 
USING (
  get_user_role() = ANY(ARRAY['direction'::user_role, 'chef_base'::user_role]) AND
  (get_user_role() = 'direction'::user_role OR base_id = get_user_base_id())
);

-- Politiques RLS pour intervention_parts
CREATE POLICY "Users can view intervention parts" 
ON public.intervention_parts 
FOR SELECT 
USING (
  get_user_role() = 'direction'::user_role OR 
  EXISTS (
    SELECT 1 FROM interventions i 
    WHERE i.id = intervention_parts.intervention_id 
    AND (i.base_id = get_user_base_id() OR i.technician_id = auth.uid())
  )
);

CREATE POLICY "Users can manage intervention parts" 
ON public.intervention_parts 
FOR ALL 
USING (
  get_user_role() = 'direction'::user_role OR 
  EXISTS (
    SELECT 1 FROM interventions i 
    WHERE i.id = intervention_parts.intervention_id 
    AND i.base_id = get_user_base_id()
  )
);

-- Créer des triggers pour les timestamps
CREATE TRIGGER update_boat_rentals_updated_at
BEFORE UPDATE ON public.boat_rentals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Calculer automatiquement le coût total des pièces
CREATE OR REPLACE FUNCTION public.calculate_intervention_part_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_cost = NEW.quantity * NEW.unit_cost;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_intervention_part_total_trigger
BEFORE INSERT OR UPDATE ON public.intervention_parts
FOR EACH ROW
EXECUTE FUNCTION public.calculate_intervention_part_total();