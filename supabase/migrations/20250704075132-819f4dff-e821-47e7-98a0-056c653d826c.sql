-- Ajouter une colonne reference dans order_items pour lier avec stock_items
ALTER TABLE public.order_items 
ADD COLUMN reference TEXT;

-- Créer un index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_order_items_reference ON public.order_items(reference);
CREATE INDEX IF NOT EXISTS idx_stock_items_reference ON public.stock_items(reference);
CREATE INDEX IF NOT EXISTS idx_stock_items_name_search ON public.stock_items USING gin(to_tsvector('french', name));