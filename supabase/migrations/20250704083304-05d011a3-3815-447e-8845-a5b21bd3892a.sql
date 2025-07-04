-- Mise à jour de la fonction pour utiliser les métadonnées d'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, base_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'technicien')::user_role,
    COALESCE(NEW.raw_user_meta_data->>'base_id', '550e8400-e29b-41d4-a716-446655440001')::uuid
  );
  RETURN NEW;
END;
$$;