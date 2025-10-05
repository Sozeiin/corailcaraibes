-- Fix boat status for marcassite
-- Change status from 'rented' to 'available' since no active rental exists

UPDATE public.boats
SET status = 'available'
WHERE name = 'marcassite' AND status = 'rented';