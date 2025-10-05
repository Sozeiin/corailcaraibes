-- Create a security definer function to check channel membership without recursion
CREATE OR REPLACE FUNCTION public.is_channel_member(channel_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.channel_members
    WHERE channel_id = channel_id_param
    AND user_id = user_id_param
  )
$$;

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view members of their channels" ON public.channel_members;

-- Create a new non-recursive policy using the security definer function
CREATE POLICY "Users can view members of their channels" 
ON public.channel_members
FOR SELECT
USING (
  -- Direction can see all
  get_user_role() = 'direction'
  -- Users can see members of public channels
  OR EXISTS (
    SELECT 1 FROM channels c 
    WHERE c.id = channel_members.channel_id 
    AND c.channel_type = 'public'
  )
  -- Users can see members of channels they belong to
  OR is_channel_member(channel_members.channel_id, auth.uid())
  -- Users can see their own membership
  OR user_id = auth.uid()
);