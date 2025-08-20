-- Corriger et activer le trigger de synchronisation stock

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS update_stock_item_purchase_info_trigger ON orders;

-- Recréer le trigger
CREATE TRIGGER update_stock_item_purchase_info_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_item_purchase_info();

-- Forcer la synchronisation des commandes livrées existantes en simulant un changement de statut
DO $$
DECLARE
  order_record RECORD;
BEGIN
  FOR order_record IN 
    SELECT DISTINCT o.id 
    FROM orders o 
    JOIN order_items oi ON oi.order_id = o.id 
    WHERE o.status = 'delivered' 
    AND oi.stock_item_id IS NULL
    LIMIT 10
  LOOP
    -- Forcer le déclenchement du trigger en changeant temporairement le statut
    UPDATE orders 
    SET status = 'confirmed' 
    WHERE id = order_record.id;
    
    -- Remettre à 'delivered' pour déclencher la synchronisation
    UPDATE orders 
    SET status = 'delivered' 
    WHERE id = order_record.id;
  END LOOP;
END $$;