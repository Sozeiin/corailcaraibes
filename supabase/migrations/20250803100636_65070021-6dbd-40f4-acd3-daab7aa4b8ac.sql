-- Corriger la structure de la table boat_checklists pour correspondre au code
ALTER TABLE public.boat_checklists 
ADD COLUMN IF NOT EXISTS general_notes TEXT,
ADD COLUMN IF NOT EXISTS technician_signature TEXT,
ADD COLUMN IF NOT EXISTS customer_signature TEXT;

-- Mettre à jour les colonnes existantes si nécessaire
-- Les signatures URL peuvent être utilisées comme fallback
UPDATE public.boat_checklists 
SET technician_signature = signature_url 
WHERE technician_signature IS NULL AND signature_url IS NOT NULL;

UPDATE public.boat_checklists 
SET customer_signature = customer_signature_url 
WHERE customer_signature IS NULL AND customer_signature_url IS NOT NULL;