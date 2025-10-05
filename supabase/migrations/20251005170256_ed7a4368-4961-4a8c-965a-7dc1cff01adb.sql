-- Drop the old problematic INSERT policy on topics
DROP POLICY IF EXISTS "Users can create topics in their channels" ON public.topics;

-- Create a new correct policy that allows topic creation in public channels and private channels where user is a member
CREATE POLICY "Users can create topics in accessible channels" 
ON public.topics
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM channels c
    LEFT JOIN channel_members cm ON (cm.channel_id = c.id AND cm.user_id = auth.uid())
    WHERE c.id = topics.channel_id
    AND (
      c.channel_type = 'public' 
      OR cm.user_id IS NOT NULL 
      OR get_user_role() = 'direction'
    )
  )
);