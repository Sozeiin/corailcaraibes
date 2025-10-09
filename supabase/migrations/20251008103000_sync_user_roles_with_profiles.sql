-- Ensure user_roles stays synchronized with profiles.role for RLS checks

-- Create or replace trigger function to keep user_roles in sync
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_role app_role;
  default_tenant uuid;
BEGIN
  -- Determine tenant to use (fallback to existing assignment)
  default_tenant := NEW.tenant_id;
  IF default_tenant IS NULL THEN
    SELECT tenant_id INTO default_tenant
    FROM public.user_roles
    WHERE user_id = NEW.id
    LIMIT 1;
  END IF;

  IF default_tenant IS NULL THEN
    SELECT id INTO default_tenant
    FROM public.tenants
    WHERE slug = 'corail-caraibes'
    LIMIT 1;
  END IF;

  -- If the profile has no role, remove any user_roles entries
  IF NEW.role IS NULL THEN
    DELETE FROM public.user_roles WHERE user_id = NEW.id;
    RETURN NEW;
  END IF;

  target_role := NEW.role::text::app_role;

  INSERT INTO public.user_roles (user_id, role, tenant_id, assigned_at, assigned_by)
  VALUES (
    NEW.id,
    target_role,
    default_tenant,
    COALESCE(NEW.updated_at, now()),
    COALESCE(auth.uid(), NEW.id)
  )
  ON CONFLICT (user_id, role) DO UPDATE
    SET tenant_id = COALESCE(EXCLUDED.tenant_id, public.user_roles.tenant_id);

  -- Remove the previous role when it changes so outdated privileges are revoked
  IF TG_OP = 'UPDATE' AND OLD.role IS NOT NULL AND OLD.role <> NEW.role THEN
    DELETE FROM public.user_roles
    WHERE user_id = NEW.id
      AND role = OLD.role::text::app_role;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger is attached to profiles
DROP TRIGGER IF EXISTS sync_profile_role_to_user_roles ON public.profiles;
CREATE TRIGGER sync_profile_role_to_user_roles
  AFTER INSERT OR UPDATE OF role, tenant_id
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_role_to_user_roles();

-- Backfill existing profiles to guarantee user_roles contains the expected entries
UPDATE public.profiles
SET role = role;
