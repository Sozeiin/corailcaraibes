ALTER TABLE public.boat_components
ADD COLUMN IF NOT EXISTS oil_change_interval_hours integer NOT NULL DEFAULT 250;