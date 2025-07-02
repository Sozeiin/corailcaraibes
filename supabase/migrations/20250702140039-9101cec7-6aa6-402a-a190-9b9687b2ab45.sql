-- Créer une base de test
INSERT INTO public.bases (name, location, phone, email, manager)
VALUES ('Base Martinique', 'Fort-de-France, Martinique', '+596 596 XX XX XX', 'martinique@corail-caraibes.com', 'chef de base martinique');

-- Récupérer l'ID de la base créée et assigner les utilisateurs
DO $$
DECLARE
    base_id_var uuid;
BEGIN
    -- Obtenir l'ID de la base créée
    SELECT id INTO base_id_var FROM public.bases WHERE name = 'Base Martinique' LIMIT 1;
    
    -- Assigner tous les utilisateurs existants à cette base
    UPDATE public.profiles 
    SET base_id = base_id_var 
    WHERE base_id IS NULL;
    
    -- Créer quelques bateaux de test pour cette base
    INSERT INTO public.boats (name, model, serial_number, year, status, base_id, next_maintenance)
    VALUES 
    ('Corail 1', 'Catamaran Lagoon 42', 'LAG42-001', 2020, 'available', base_id_var, '2025-08-01'),
    ('Corail 2', 'Catamaran Lagoon 46', 'LAG46-002', 2021, 'available', base_id_var, '2025-09-15'),
    ('Corail 3', 'Voilier Beneteau 50', 'BEN50-003', 2019, 'maintenance', base_id_var, '2025-07-15');
END $$;