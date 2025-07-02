-- Fonction pour automatiquement ajouter les articles au stock quand une commande est livrée
CREATE OR REPLACE FUNCTION public.handle_order_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si le statut passe à 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Ajouter/mettre à jour les articles dans le stock
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
      'CMD-' || NEW.order_number || '-' || oi.id,
      COALESCE(s.category, 'Autre'),
      oi.quantity,
      GREATEST(ROUND(oi.quantity * 0.1), 1), -- Seuil minimum = 10% de la quantité livrée (minimum 1)
      'pièce',
      'Livraison ' || NEW.order_number,
      NEW.base_id,
      NOW()
    FROM order_items oi
    LEFT JOIN suppliers s ON s.id = NEW.supplier_id
    WHERE oi.order_id = NEW.id
    ON CONFLICT (name, base_id) -- Si l'article existe déjà pour cette base
    DO UPDATE SET
      quantity = stock_items.quantity + EXCLUDED.quantity,
      last_updated = NOW(),
      reference = CASE 
        WHEN stock_items.reference IS NULL OR stock_items.reference = '' 
        THEN EXCLUDED.reference 
        ELSE stock_items.reference 
      END;
      
    -- Log de l'opération pour traçabilité
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
$$;

-- Créer le trigger sur la table orders
DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
CREATE TRIGGER on_order_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_delivery();

-- Créer une contrainte unique composite pour éviter les doublons
ALTER TABLE public.stock_items 
DROP CONSTRAINT IF EXISTS unique_stock_item_per_base;

ALTER TABLE public.stock_items 
ADD CONSTRAINT unique_stock_item_per_base 
UNIQUE (name, base_id);