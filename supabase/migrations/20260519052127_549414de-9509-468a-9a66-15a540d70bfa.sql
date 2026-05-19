
-- 1) Nettoyage des partages ONE WAY actifs obsolètes
-- Garder au plus un partage actif par bateau (le plus récent),
-- et seulement si le bateau est actuellement dans une base différente de son owner_base.
WITH ranked AS (
  SELECT bs.id,
         bs.boat_id,
         bs.owner_base_id,
         bs.shared_with_base_id,
         bs.status,
         b.base_id AS current_base_id,
         ROW_NUMBER() OVER (PARTITION BY bs.boat_id ORDER BY bs.created_at DESC) AS rn
  FROM public.boat_sharing bs
  JOIN public.boats b ON b.id = bs.boat_id
  WHERE bs.status = 'active'
)
UPDATE public.boat_sharing bs
SET status = 'ended',
    updated_at = now()
FROM ranked r
WHERE bs.id = r.id
  AND (
    r.rn > 1
    OR r.current_base_id = r.owner_base_id  -- bateau revenu chez l'owner => partage obsolète
    OR r.current_base_id <> r.shared_with_base_id -- partage qui ne reflète plus la base courante
  );

-- 2) Index unique partiel: un seul partage 'active' par bateau
DROP INDEX IF EXISTS public.uniq_boat_sharing_active_per_boat;
CREATE UNIQUE INDEX uniq_boat_sharing_active_per_boat
  ON public.boat_sharing (boat_id)
  WHERE status = 'active';

-- 3) Désactiver l'ancien trigger d'auto-création de partage à la création/édition de fiche.
-- La création du partage doit se faire UNIQUEMENT au check-in via le RPC idempotent.
DROP TRIGGER IF EXISTS trg_activate_one_way_sharing ON public.administrative_checkin_forms;
DROP TRIGGER IF EXISTS activate_one_way_sharing_trigger ON public.administrative_checkin_forms;

-- 4) RPC ONE WAY idempotent (check-in)
CREATE OR REPLACE FUNCTION public.handle_one_way_checkin_transfer(
  p_boat_id UUID,
  p_from_base_id UUID,
  p_to_base_id UUID,
  p_transferred_by UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_base UUID;
  v_recent_transfer_exists BOOLEAN;
BEGIN
  IF p_boat_id IS NULL OR p_to_base_id IS NULL THEN
    RAISE EXCEPTION 'boat_id and to_base_id are required';
  END IF;

  SELECT base_id INTO v_current_base FROM public.boats WHERE id = p_boat_id;
  IF v_current_base IS NULL THEN
    RAISE EXCEPTION 'Boat % not found', p_boat_id;
  END IF;

  -- No-op si le bateau est déjà sur la base de destination
  IF v_current_base = p_to_base_id THEN
    -- on s'assure quand même qu'il n'y a pas de partage actif fantôme
    UPDATE public.boat_sharing
       SET status = 'ended', updated_at = now()
     WHERE boat_id = p_boat_id AND status = 'active';
    RETURN;
  END IF;

  -- Refus du transfert si from = to
  IF p_from_base_id IS NOT NULL AND p_from_base_id = p_to_base_id THEN
    RAISE EXCEPTION 'from_base_id and to_base_id must differ';
  END IF;

  -- Clôturer tout partage actif précédent du bateau
  UPDATE public.boat_sharing
     SET status = 'ended', updated_at = now()
   WHERE boat_id = p_boat_id AND status = 'active';

  -- Transférer le bateau
  UPDATE public.boats
     SET base_id = p_to_base_id,
         status = 'rented',
         updated_at = now()
   WHERE id = p_boat_id;

  -- Eviter un doublon de log si un transfert identique a eu lieu il y a < 5 minutes
  SELECT EXISTS (
    SELECT 1 FROM public.boat_base_transfers
     WHERE boat_id = p_boat_id
       AND to_base_id = p_to_base_id
       AND transfer_date > now() - interval '5 minutes'
  ) INTO v_recent_transfer_exists;

  IF NOT v_recent_transfer_exists THEN
    INSERT INTO public.boat_base_transfers (boat_id, from_base_id, to_base_id, reason, transferred_by)
    VALUES (
      p_boat_id,
      COALESCE(p_from_base_id, v_current_base),
      p_to_base_id,
      'Location ONE WAY - transfert automatique au check-in',
      p_transferred_by
    );
  END IF;
END;
$$;

-- 5) RPC de clôture ONE WAY au check-out
CREATE OR REPLACE FUNCTION public.handle_one_way_checkout_close(
  p_boat_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_boat_id IS NULL THEN
    RAISE EXCEPTION 'boat_id is required';
  END IF;

  UPDATE public.boat_sharing
     SET status = 'ended', updated_at = now()
   WHERE boat_id = p_boat_id AND status = 'active';
END;
$$;
