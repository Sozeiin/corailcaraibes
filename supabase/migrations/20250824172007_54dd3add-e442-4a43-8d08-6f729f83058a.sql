-- Ajouter une colonne base_id à order_items pour optimiser les requêtes
ALTER TABLE public.order_items 
ADD COLUMN base_id uuid;

-- Mettre à jour les données existantes avec le base_id des commandes
UPDATE public.order_items 
SET base_id = orders.base_id 
FROM public.orders 
WHERE order_items.order_id = orders.id;

-- Créer un trigger pour automatiquement définir le base_id lors de l'insertion
CREATE OR REPLACE FUNCTION public.set_order_item_base_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Récupérer le base_id de la commande parent
  SELECT base_id INTO NEW.base_id 
  FROM public.orders 
  WHERE id = NEW.order_id;
  
  RETURN NEW;
END;
$function$;

-- Créer le trigger pour les nouvelles insertions
CREATE TRIGGER set_order_item_base_id_trigger
  BEFORE INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_item_base_id();

-- Créer un index pour optimiser les requêtes par base_id
CREATE INDEX idx_order_items_base_id ON public.order_items(base_id);