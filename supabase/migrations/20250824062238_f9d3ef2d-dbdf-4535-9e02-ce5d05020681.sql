-- Redefine handle_intervention_completion to handle INSERT and UPDATE
CREATE OR REPLACE FUNCTION public.handle_intervention_completion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.status = 'completed'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    UPDATE public.stock_items
    SET
      quantity = stock_items.quantity - ip.quantity,
      last_updated = NOW()
    FROM public.intervention_parts ip
    WHERE stock_items.id = ip.stock_item_id
      AND ip.intervention_id = NEW.id
      AND ip.stock_item_id IS NOT NULL;

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
$function$;

DROP TRIGGER IF EXISTS handle_intervention_completion_trigger ON public.interventions;

CREATE TRIGGER handle_intervention_completion_trigger
AFTER INSERT OR UPDATE ON public.interventions
FOR EACH ROW
EXECUTE FUNCTION public.handle_intervention_completion();
