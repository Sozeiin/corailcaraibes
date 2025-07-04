-- Supprimer l'ancien trigger qui entre en conflit
DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;

-- Recréer le trigger avec la nouvelle fonction qui gère les deux cas
CREATE TRIGGER on_order_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_bulk_order_delivery();