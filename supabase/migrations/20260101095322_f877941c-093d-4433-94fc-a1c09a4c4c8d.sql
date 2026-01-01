-- Fix delete_user_cascade: align with current messaging schema (topics/messages) and remove non-existing columns
CREATE OR REPLACE FUNCTION public.delete_user_cascade(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only direction can delete users
  IF NOT has_role(auth.uid(), 'direction'::app_role) THEN
    RAISE EXCEPTION 'Only direction can delete users';
  END IF;

  -- Messaging / assignments cleanup
  DELETE FROM public.thread_assignments WHERE user_id = user_id_param OR assigned_by = user_id_param;
  DELETE FROM public.messages WHERE author_id = user_id_param;
  DELETE FROM public.topics WHERE created_by = user_id_param OR assigned_to = user_id_param OR closed_by = user_id_param;
  DELETE FROM public.channel_members WHERE user_id = user_id_param;

  -- App notifications / push
  DELETE FROM public.notifications WHERE user_id = user_id_param;
  DELETE FROM public.push_subscriptions WHERE user_id = user_id_param;

  -- Roles & profile
  DELETE FROM public.user_roles WHERE user_id = user_id_param;
  DELETE FROM public.profiles WHERE id = user_id_param;

  -- Auth user
  DELETE FROM auth.users WHERE id = user_id_param;
END;
$$;