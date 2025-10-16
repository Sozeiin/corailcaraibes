-- Supprimer l'ancienne contrainte de statut
ALTER TABLE administrative_checkin_forms 
DROP CONSTRAINT IF EXISTS administrative_checkin_forms_status_check;

-- Ajouter la nouvelle contrainte avec les valeurs 'draft' et 'completed'
ALTER TABLE administrative_checkin_forms 
ADD CONSTRAINT administrative_checkin_forms_status_check 
CHECK (status = ANY (ARRAY['draft'::text, 'ready'::text, 'used'::text, 'completed'::text, 'expired'::text]));