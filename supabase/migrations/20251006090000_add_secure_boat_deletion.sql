-- Secure boat deletion function to bypass cascading RLS restrictions
CREATE OR REPLACE FUNCTION public.delete_boat_cascade(p_boat_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
  v_boat_base uuid;
  v_user_base uuid;
BEGIN
  SELECT get_user_role() INTO v_role;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Vous devez être authentifié pour supprimer un bateau.' USING ERRCODE = '42501';
  END IF;

  SELECT base_id INTO v_boat_base FROM public.boats WHERE id = p_boat_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bateau introuvable.' USING ERRCODE = 'P0002';
  END IF;

  SELECT get_user_base_id() INTO v_user_base;

  IF v_role = 'chef_base' THEN
    IF v_boat_base IS NULL OR v_user_base IS NULL OR v_boat_base <> v_user_base THEN
      RAISE EXCEPTION 'Vous ne pouvez supprimer que les bateaux de votre base.' USING ERRCODE = '42501';
    END IF;
  ELSIF v_role NOT IN ('direction', 'administratif') THEN
    RAISE EXCEPTION 'Vous n''avez pas les permissions nécessaires.' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.boats WHERE id = p_boat_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bateau introuvable.' USING ERRCODE = 'P0002';
  END IF;

  RETURN p_boat_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_boat_cascade(uuid) TO authenticated;
