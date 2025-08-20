-- Corriger et activer le trigger de synchronisation stock
-- D'abord, s'assurer que le trigger est bien attaché à la table orders

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS update_stock_item_purchase_info_trigger ON orders;

-- Recréer le trigger
CREATE TRIGGER update_stock_item_purchase_info_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_item_purchase_info();

-- Tester la fonction manuellement sur les commandes livrées existantes
-- Simuler une mise à jour pour déclencher la synchronisation
UPDATE orders 
SET updated_at = NOW()
WHERE status = 'delivered' 
AND id IN (
  SELECT DISTINCT o.id 
  FROM orders o 
  JOIN order_items oi ON oi.order_id = o.id 
  WHERE o.status = 'delivered' 
  AND oi.stock_item_id IS NULL
  LIMIT 5
);

-- Vérifier que la fonction pg_trgm est disponible pour les correspondances
SELECT COUNT(*) as available_similarity FROM pg_proc WHERE proname = 'similarity';