-- Migration: Refonte du système de check-in avec liaison clients (avec nettoyage préalable)
-- Objectif: Éliminer la duplication de données et renforcer la relation avec customers

-- Étape 0: Supprimer les fiches orphelines sans customer_id (données invalides)
DELETE FROM administrative_checkin_forms WHERE customer_id IS NULL;

-- Étape 1: Ajouter la contrainte de clé étrangère sur customer_id
ALTER TABLE administrative_checkin_forms
ADD CONSTRAINT fk_administrative_checkin_customer
FOREIGN KEY (customer_id) 
REFERENCES customers(id) 
ON DELETE CASCADE;

-- Étape 2: Rendre customer_id obligatoire
ALTER TABLE administrative_checkin_forms
ALTER COLUMN customer_id SET NOT NULL;

-- Étape 3: Créer un index pour optimiser les joins
CREATE INDEX IF NOT EXISTS idx_checkin_forms_customer_id 
ON administrative_checkin_forms(customer_id);

-- Étape 4: Supprimer les colonnes redondantes qui dupliquent les données de customers
ALTER TABLE administrative_checkin_forms
DROP COLUMN IF EXISTS customer_name,
DROP COLUMN IF EXISTS customer_email,
DROP COLUMN IF EXISTS customer_phone,
DROP COLUMN IF EXISTS customer_address,
DROP COLUMN IF EXISTS customer_id_number;

-- Note: Les données client seront désormais accessibles uniquement via la relation customer_id -> customers