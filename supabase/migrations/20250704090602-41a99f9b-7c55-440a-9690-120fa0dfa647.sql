-- Ajouter une colonne pour le prix unitaire dans la table stock_items
ALTER TABLE public.stock_items 
ADD COLUMN unit_price NUMERIC DEFAULT 0;