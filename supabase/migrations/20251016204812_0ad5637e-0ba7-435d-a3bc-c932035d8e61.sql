-- Étape 1 : Corriger les données existantes
-- Mettre à jour user_roles pour correspondre à profiles
UPDATE user_roles ur
SET role = p.role::text::app_role
FROM profiles p
WHERE ur.user_id = p.id 
  AND ur.role::text != p.role::text;

-- Ajouter les utilisateurs manquants dans user_roles
INSERT INTO user_roles (user_id, role)
SELECT p.id, p.role::text::app_role
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Étape 2 : Créer le trigger de synchronisation automatique
CREATE OR REPLACE FUNCTION sync_user_roles()
RETURNS TRIGGER AS $$
BEGIN
  -- Insérer ou mettre à jour le rôle dans user_roles
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, NEW.role::text::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Si le rôle a changé, supprimer l'ancien rôle
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    DELETE FROM user_roles 
    WHERE user_id = NEW.id 
      AND role = OLD.role::text::app_role;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Créer le trigger sur la table profiles
DROP TRIGGER IF EXISTS sync_user_roles_trigger ON profiles;
CREATE TRIGGER sync_user_roles_trigger
AFTER INSERT OR UPDATE OF role ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_user_roles();