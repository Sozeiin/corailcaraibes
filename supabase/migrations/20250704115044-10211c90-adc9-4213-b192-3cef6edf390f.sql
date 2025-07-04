-- First add unique constraint on name for checklist_items
ALTER TABLE public.checklist_items ADD CONSTRAINT checklist_items_name_unique UNIQUE (name);

-- Populate checklist items for boat rentals
INSERT INTO public.checklist_items (name, category, is_required) VALUES
-- Sécurité
('Gilets de sauvetage (nombre et état)', 'Sécurité', true),
('Trousse de premiers secours', 'Sécurité', true),
('Signaux de détresse (fusées, corne de brume)', 'Sécurité', true),
('Extincteur', 'Sécurité', true),
('Radio VHF', 'Sécurité', true),
('Éclairage de navigation', 'Sécurité', true),
('Miroir de signalisation', 'Sécurité', false),

-- Motorisation
('Niveau d''huile moteur', 'Motorisation', true),
('Niveau de carburant', 'Motorisation', true),
('État de l''hélice', 'Motorisation', true),
('Fonctionnement du démarreur', 'Motorisation', true),
('Système de refroidissement', 'Motorisation', true),
('Courroies et durites', 'Motorisation', false),

-- Coque et structure
('Intégrité de la coque', 'Coque et structure', true),
('État du pont', 'Coque et structure', true),
('Garde-corps et rambarde', 'Coque et structure', true),
('Échelle de bain', 'Coque et structure', false),
('Bouchon de vidange', 'Coque et structure', true),
('Ancre et chaîne', 'Coque et structure', true),

-- Équipements électriques
('Batterie (charge et fixation)', 'Équipements électriques', true),
('Éclairage intérieur', 'Équipements électriques', false),
('Tableau de bord', 'Équipements électriques', true),
('Prises électriques', 'Équipements électriques', false),

-- Navigation
('Compas', 'Navigation', true),
('Cartes marines', 'Navigation', false),
('GPS (si équipé)', 'Navigation', false),
('Sondeur (si équipé)', 'Navigation', false),

-- Confort
('Coussins et sièges', 'Confort', false),
('Taud de soleil', 'Confort', false),
('Réfrigérateur (si équipé)', 'Confort', false),
('WC (si équipé)', 'Confort', false),

-- Documentation
('Permis bateau du locataire', 'Documentation', true),
('Assurance bateau', 'Documentation', true),
('Certificat de conformité', 'Documentation', false),
('Manuel d''utilisation', 'Documentation', false)

ON CONFLICT (name) DO NOTHING;