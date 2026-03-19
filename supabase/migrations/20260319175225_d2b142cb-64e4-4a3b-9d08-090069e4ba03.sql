-- Mettre le bateau RUBIS en base Martinique et disponible
UPDATE boats 
SET base_id = '550e8400-e29b-41d4-a716-446655440001', 
    status = 'available', 
    updated_at = now() 
WHERE id = '6f5e8b7a-a53f-4213-bf33-009261430396';