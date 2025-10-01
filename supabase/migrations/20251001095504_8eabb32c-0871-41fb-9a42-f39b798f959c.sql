-- Mettre à jour manuellement le bateau test en disponible
UPDATE boats 
SET status = 'available', updated_at = NOW()
WHERE name = 'test';