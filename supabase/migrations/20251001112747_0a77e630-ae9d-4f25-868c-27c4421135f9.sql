-- Données de démonstration pour la messagerie

-- Canaux par défaut
INSERT INTO public.channels (name, description, channel_type) VALUES
('général', 'Discussions générales', 'public'),
('sav', 'Support après-vente', 'public'),
('maintenance', 'Interventions de maintenance', 'public'),
('pièces', 'Gestion des pièces et stock', 'public'),
('administratif', 'Administration et RH', 'public'),
('direction', 'Canal réservé à la direction', 'private')
ON CONFLICT DO NOTHING;

-- Ajouter automatiquement les users existants aux canaux publics
INSERT INTO public.channel_members (channel_id, user_id)
SELECT c.id, p.id
FROM public.channels c
CROSS JOIN public.profiles p
WHERE c.channel_type = 'public'
ON CONFLICT (channel_id, user_id) DO NOTHING;

-- Quelques sujets d'exemple (on prend le premier canal général)
DO $$
DECLARE
  v_general_channel_id UUID;
  v_sav_channel_id UUID;
  v_maintenance_channel_id UUID;
  v_first_user_id UUID;
  v_first_boat_id UUID;
  v_first_base_id UUID;
BEGIN
  -- Récupérer les IDs des canaux
  SELECT id INTO v_general_channel_id FROM public.channels WHERE name = 'général' LIMIT 1;
  SELECT id INTO v_sav_channel_id FROM public.channels WHERE name = 'sav' LIMIT 1;
  SELECT id INTO v_maintenance_channel_id FROM public.channels WHERE name = 'maintenance' LIMIT 1;
  
  -- Récupérer un utilisateur, bateau et base pour les exemples
  SELECT id INTO v_first_user_id FROM public.profiles LIMIT 1;
  SELECT id INTO v_first_boat_id FROM public.boats LIMIT 1;
  SELECT id INTO v_first_base_id FROM public.bases LIMIT 1;
  
  IF v_general_channel_id IS NOT NULL AND v_first_user_id IS NOT NULL THEN
    -- Sujet dans le canal général
    INSERT INTO public.topics (channel_id, title, description, status, priority, created_by, base_id)
    VALUES (
      v_general_channel_id,
      'Bienvenue sur la messagerie',
      'Utilisez cette messagerie pour communiquer avec votre équipe et suivre l''avancement des tâches.',
      'todo',
      'low',
      v_first_user_id,
      v_first_base_id
    );
  END IF;
  
  IF v_sav_channel_id IS NOT NULL AND v_first_user_id IS NOT NULL AND v_first_boat_id IS NOT NULL THEN
    -- Sujet dans le canal SAV avec bateau
    INSERT INTO public.topics (channel_id, title, description, status, priority, boat_id, base_id, created_by)
    VALUES (
      v_sav_channel_id,
      'Problème électrique - Urgent',
      'Le client signale une panne électrique intermittente. À vérifier rapidement.',
      'in_progress',
      'high',
      v_first_boat_id,
      v_first_base_id,
      v_first_user_id
    );
  END IF;
  
  IF v_maintenance_channel_id IS NOT NULL AND v_first_user_id IS NOT NULL AND v_first_boat_id IS NOT NULL THEN
    -- Sujet dans le canal maintenance
    INSERT INTO public.topics (channel_id, title, description, status, priority, boat_id, base_id, created_by)
    VALUES (
      v_maintenance_channel_id,
      'Révision moteur programmée',
      'Révision des 250h à effectuer sur le moteur tribord.',
      'todo',
      'medium',
      v_first_boat_id,
      v_first_base_id,
      v_first_user_id
    );
  END IF;
END $$;