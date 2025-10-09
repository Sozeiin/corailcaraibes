-- Ensure has_role continues to work even if user_roles sync is delayed
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = _user_id
        AND role IS NOT NULL
        AND role::text = _role::text
    );
$$;
