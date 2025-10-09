-- Restore administrative access to check-in forms when role sync is delayed
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_role text;
BEGIN
  -- Primary source: explicit assignments in user_roles
  IF EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  ) THEN
    RETURN true;
  END IF;

  -- Fallback to the legacy role stored on the profile while the sync catches up
  SELECT role::text
  INTO profile_role
  FROM public.profiles
  WHERE id = _user_id;

  IF profile_role IS NULL THEN
    RETURN false;
  END IF;

  IF profile_role = _role::text THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Recreate check-in policies with legacy role fallback to avoid lockouts
DROP POLICY IF EXISTS "Direction can manage all checkin forms" ON public.administrative_checkin_forms;
DROP POLICY IF EXISTS "Chef_base and administratif can manage forms in their base" ON public.administrative_checkin_forms;
DROP POLICY IF EXISTS "Technicians can view and update forms in their base" ON public.administrative_checkin_forms;

CREATE POLICY "Direction can manage all checkin forms"
ON public.administrative_checkin_forms
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'direction')
  OR get_user_role() = 'direction'::user_role
)
WITH CHECK (
  public.has_role(auth.uid(), 'direction')
  OR get_user_role() = 'direction'::user_role
);

CREATE POLICY "Chef_base and administratif can manage forms in their base"
ON public.administrative_checkin_forms
FOR ALL
TO authenticated
USING (
  (
    public.has_role(auth.uid(), 'chef_base')
    OR public.has_role(auth.uid(), 'administratif')
    OR get_user_role() IN ('chef_base'::user_role, 'administratif'::user_role)
  )
  AND base_id = get_user_base_id()
)
WITH CHECK (
  (
    public.has_role(auth.uid(), 'chef_base')
    OR public.has_role(auth.uid(), 'administratif')
    OR get_user_role() IN ('chef_base'::user_role, 'administratif'::user_role)
  )
  AND base_id = get_user_base_id()
);

CREATE POLICY "Technicians can view and update forms in their base"
ON public.administrative_checkin_forms
FOR ALL
TO authenticated
USING (
  (
    public.has_role(auth.uid(), 'technicien')
    OR get_user_role() = 'technicien'::user_role
  )
  AND base_id = get_user_base_id()
)
WITH CHECK (
  (
    public.has_role(auth.uid(), 'technicien')
    OR get_user_role() = 'technicien'::user_role
  )
  AND base_id = get_user_base_id()
);
