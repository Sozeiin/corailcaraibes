-- Mettre à jour la fonction handle_order_delivery pour utiliser les références des order_items
CREATE OR REPLACE FUNCTION public.handle_order_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si le statut passe à 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Ajouter/mettre à jour les articles dans le stock en utilisant les références
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
      COALESCE(oi.reference, public.generate_stock_reference()), -- Utiliser la référence de la commande ou en générer une
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
      -- Mettre à jour la référence si elle était vide
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