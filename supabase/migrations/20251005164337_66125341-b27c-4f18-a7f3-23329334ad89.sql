-- Fix boat status for MARCASSITE (case-sensitive)
-- Change status from 'rented' to 'available'

UPDATE public.boats
SET status = 'available'
WHERE id = '197f414f-d4d4-4cc7-bc3a-da565cda9063' AND status = 'rented';