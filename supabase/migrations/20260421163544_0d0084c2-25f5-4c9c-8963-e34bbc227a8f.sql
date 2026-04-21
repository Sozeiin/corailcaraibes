-- Clean up duplicates that conflict with the unique constraint, keeping the most recent
DELETE FROM public.checkin_drafts a
USING public.checkin_drafts b
WHERE a.boat_id = b.boat_id
  AND a.checklist_type = b.checklist_type
  AND a.boat_id IS NOT NULL
  AND a.checklist_type IS NOT NULL
  AND a.updated_at < b.updated_at;

-- Add a unique constraint to prevent collisions between check-in and check-out drafts on the same boat
CREATE UNIQUE INDEX IF NOT EXISTS checkin_drafts_boat_type_unique
  ON public.checkin_drafts (boat_id, checklist_type)
  WHERE boat_id IS NOT NULL AND checklist_type IS NOT NULL;