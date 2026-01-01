-- Fix delete_user_cascade to allow direction (profiles) OR super_admin (user_roles)
CREATE OR REPLACE FUNCTION public.delete_user_cascade(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow deletion if user is direction (via profiles) OR super_admin (via user_roles)
  IF NOT (get_user_role() = 'direction'::user_role OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Permissions insuffisantes pour supprimer des utilisateurs'
      USING ERRCODE = '42501'; -- insufficient_privilege
  END IF;

  -- Delete pure user data (not handled by SET NULL FKs)
  DELETE FROM public.channel_members WHERE user_id = user_id_param;
  DELETE FROM public.notifications WHERE user_id = user_id_param;
  DELETE FROM public.push_subscriptions WHERE user_id = user_id_param;
  DELETE FROM public.user_roles WHERE user_id = user_id_param;
  
  -- Delete profile (will SET NULL on all referencing columns)
  DELETE FROM public.profiles WHERE id = user_id_param;

  -- Delete auth user
  DELETE FROM auth.users WHERE id = user_id_param;
END;
$$;