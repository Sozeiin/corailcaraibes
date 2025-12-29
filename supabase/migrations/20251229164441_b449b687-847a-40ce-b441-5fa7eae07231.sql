-- Fix handle_new_user trigger to include tenant_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, base_id, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'technicien')::public.user_role,
    COALESCE(NEW.raw_user_meta_data->>'base_id', '550e8400-e29b-41d4-a716-446655440001')::uuid,
    (NEW.raw_user_meta_data->>'tenant_id')::uuid
  );
  RETURN NEW;
END;
$function$;