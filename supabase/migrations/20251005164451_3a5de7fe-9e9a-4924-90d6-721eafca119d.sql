-- Change boat AMAZONITE status to available
UPDATE public.boats
SET status = 'available'
WHERE id = '3f712393-87eb-495d-8601-6e9c4c91ffff' AND status = 'rented';