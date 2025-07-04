-- Créer une fonction pour décrémenter le stock automatiquement
CREATE OR REPLACE FUNCTION public.handle_intervention_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Si l'intervention passe au statut 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Décrémenter le stock pour toutes les pièces utilisées dans cette intervention
    UPDATE public.stock_items 
    SET 
      quantity = stock_items.quantity - ip.quantity,
      last_updated = NOW()
    FROM public.intervention_parts ip
    WHERE stock_items.id = ip.stock_item_id 
    AND ip.intervention_id = NEW.id
    AND ip.stock_item_id IS NOT NULL;
    
    -- Log de l'opération
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
      'Le stock a été décrémenté suite à la finalisation de l''intervention ' || NEW.title,
      NEW.base_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur la table interventions
CREATE TRIGGER handle_intervention_completion_trigger
AFTER UPDATE ON public.interventions
FOR EACH ROW
EXECUTE FUNCTION public.handle_intervention_completion();