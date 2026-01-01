
-- Fix remaining FKs that failed (orders.approved_by doesn't exist, skip it)
-- Also add the simplified delete_user_cascade function

-- Simplify delete_user_cascade now that FKs handle cascading
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
