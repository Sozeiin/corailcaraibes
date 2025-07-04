-- Ajouter des prix par défaut aux articles existants pour tester
UPDATE public.stock_items 
SET unit_price = CASE 
  WHEN name LIKE '%pompe%' OR name LIKE '%Pompe%' THEN 150.00
  WHEN name LIKE '%moteur%' OR name LIKE '%Moteur%' THEN 800.00
  WHEN name LIKE '%vis%' OR name LIKE '%Vis%' THEN 2.50
  WHEN name LIKE '%joint%' OR name LIKE '%Joint%' THEN 5.00
  WHEN name LIKE '%filtre%' OR name LIKE '%Filtre%' THEN 25.00
  ELSE 10.00
END
WHERE unit_price = 0;