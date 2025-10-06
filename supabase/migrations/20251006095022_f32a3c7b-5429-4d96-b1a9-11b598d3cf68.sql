-- Assigner le rôle super_admin à admin@admin.com

-- 1. Insérer le rôle super_admin dans user_roles
INSERT INTO public.user_roles (user_id, role, tenant_id)
VALUES (
  'f024aa89-6b96-4808-9d33-3e2f72336a95',
  'super_admin'::app_role,
  NULL  -- Super admin n'est pas lié à un tenant spécifique
)
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Mettre à jour le profil pour la compatibilité (optionnel)
UPDATE public.profiles
SET 
  role = 'direction'::user_role,  -- Pour la compatibilité avec l'ancien système
  tenant_id = NULL  -- Super admin n'est pas lié à un tenant
WHERE id = 'f024aa89-6b96-4808-9d33-3e2f72336a95';