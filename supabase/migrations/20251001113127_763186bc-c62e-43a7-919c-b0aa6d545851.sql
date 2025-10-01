-- Fix infinite recursion in channel_members RLS policies
DROP POLICY IF EXISTS "Users can view channel members" ON public.channel_members;
DROP POLICY IF EXISTS "Direction and admins can manage members" ON public.channel_members;

-- Create a security definer function to check channel membership
CREATE OR REPLACE FUNCTION public.is_channel_member(channel_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM channel_members 
    WHERE channel_id = channel_id_param 
    AND user_id = user_id_param
  );
$$;

-- Create a function to check if channel is public
CREATE OR REPLACE FUNCTION public.is_public_channel(channel_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM channels 
    WHERE id = channel_id_param 
    AND channel_type = 'public'
  );
$$;

-- Recreate policies without recursion
CREATE POLICY "Users can view channel members"
ON public.channel_members
FOR SELECT
USING (
  get_user_role() = 'direction'
  OR is_public_channel(channel_id)
  OR user_id = auth.uid()
);

CREATE POLICY "Direction and admins can manage members"
ON public.channel_members
FOR ALL
USING (get_user_role() IN ('direction', 'chef_base'));

-- Fix channels policies to allow viewing
DROP POLICY IF EXISTS "Users can view private channels they are member of" ON public.channels;
DROP POLICY IF EXISTS "Users can view public channels" ON public.channels;

CREATE POLICY "Users can view public channels"
ON public.channels
FOR SELECT
USING (channel_type = 'public' OR get_user_role() = 'direction');

CREATE POLICY "Users can view private channels they are member of"
ON public.channels
FOR SELECT
USING (
  channel_type = 'private' 
  AND (
    get_user_role() = 'direction'
    OR is_channel_member(id, auth.uid())
  )
);