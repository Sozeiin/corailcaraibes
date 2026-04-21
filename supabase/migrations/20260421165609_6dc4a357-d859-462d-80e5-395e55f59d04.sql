-- Add timezone column to bases table
ALTER TABLE public.bases 
ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Martinique';

-- Initialize timezones based on base name patterns
UPDATE public.bases
SET timezone = CASE
  WHEN name ILIKE '%guadeloupe%' OR location ILIKE '%guadeloupe%' THEN 'America/Guadeloupe'
  WHEN name ILIKE '%martinique%' OR location ILIKE '%martinique%' THEN 'America/Martinique'
  WHEN name ILIKE '%france%' OR name ILIKE '%métropole%' OR name ILIKE '%metropole%' OR name ILIKE '%paris%' 
       OR location ILIKE '%france%' OR location ILIKE '%métropole%' OR location ILIKE '%metropole%' OR location ILIKE '%paris%' 
    THEN 'Europe/Paris'
  ELSE 'America/Martinique'
END;

-- Update bases_public view to include timezone if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'bases_public') THEN
    EXECUTE 'DROP VIEW public.bases_public CASCADE';
    EXECUTE 'CREATE VIEW public.bases_public AS SELECT id, name, location, timezone FROM public.bases';
    EXECUTE 'GRANT SELECT ON public.bases_public TO anon, authenticated';
  END IF;
END $$;