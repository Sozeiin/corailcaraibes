-- Créer une séquence pour les références des articles de stock
CREATE SEQUENCE IF NOT EXISTS public.stock_reference_seq START 1000;

-- Fonction pour générer automatiquement une référence unique
CREATE OR REPLACE FUNCTION public.generate_stock_reference()
RETURNS TEXT AS $$
DECLARE
  next_val INTEGER;
  new_reference TEXT;
BEGIN
  -- Obtenir le prochain numéro de la séquence
  SELECT nextval('public.stock_reference_seq') INTO next_val;
  
  -- Formatter la référence avec un préfixe
  new_reference := 'STK-' || LPAD(next_val::TEXT, 6, '0');
  
  RETURN new_reference;
END;
$$ LANGUAGE plpgsql;

-- Fonction trigger pour auto-générer la référence si elle est vide
CREATE OR REPLACE FUNCTION public.auto_generate_stock_reference()
RETURNS trigger AS $$
BEGIN
  -- Si la référence est vide ou NULL, générer automatiquement
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := public.generate_stock_reference();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur la table stock_items
DROP TRIGGER IF EXISTS auto_stock_reference_trigger ON public.stock_items;
CREATE TRIGGER auto_stock_reference_trigger
  BEFORE INSERT ON public.stock_items
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_stock_reference();

-- Mettre à jour les articles existants sans référence
UPDATE public.stock_items 
SET reference = public.generate_stock_reference()
WHERE reference IS NULL OR reference = '';

-- Modifier la fonction handle_order_delivery pour utiliser la génération automatique
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
      reference, -- Laissé NULL pour que l'auto-génération fonctionne
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
      last_updated = NOW();
      
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