-- Fix delete_user_cascade function to remove reference to non-existent thread_assignees table
CREATE OR REPLACE FUNCTION public.delete_user_cascade(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if calling user has direction role
  IF NOT has_role(auth.uid(), 'direction') THEN
    RAISE EXCEPTION 'Only direction can delete users';
  END IF;
  
  -- Delete related records in proper order
  DELETE FROM public.channel_members WHERE user_id = user_id_param;
  DELETE FROM public.messages WHERE sender_id = user_id_param;
  DELETE FROM public.threads WHERE created_by = user_id_param;
  DELETE FROM public.notifications WHERE user_id = user_id_param;
  DELETE FROM public.push_subscriptions WHERE user_id = user_id_param;
  DELETE FROM public.user_roles WHERE user_id = user_id_param;
  DELETE FROM public.profiles WHERE id = user_id_param;
  
  -- Delete from auth.users
  DELETE FROM auth.users WHERE id = user_id_param;
END;
$$;