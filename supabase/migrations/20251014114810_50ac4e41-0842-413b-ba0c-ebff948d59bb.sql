-- Politique DELETE pour Direction (peut supprimer tous les profils de son tenant)
CREATE POLICY "Direction can delete profiles in their tenant"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'direction'::app_role)
  AND tenant_id = get_user_tenant_id()
);

-- Politique DELETE pour Super Admin (peut supprimer n'importe quel profil)
CREATE POLICY "Super admin can delete any profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Fonction pour supprimer l'utilisateur de auth.users quand il est supprimé de profiles
CREATE OR REPLACE FUNCTION public.delete_auth_user_on_profile_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Supprimer l'utilisateur de auth.users
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

-- Trigger qui s'exécute APRÈS la suppression d'un profil
CREATE TRIGGER trigger_delete_auth_user
AFTER DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.delete_auth_user_on_profile_delete();