-- Phase 5: Channel and Thread Deletion System
-- Allow direction role to delete channels and topics with proper cascades

-- 1. Add DELETE policy for channels (direction only)
CREATE POLICY "Direction can delete channels"
ON public.channels
FOR DELETE
TO authenticated
USING (get_user_role() = 'direction');

-- 2. Add DELETE policy for topics (direction only)
CREATE POLICY "Direction can delete topics"
ON public.topics
FOR DELETE
TO authenticated
USING (get_user_role() = 'direction');

-- 3. Ensure CASCADE deletions are properly configured
-- When a topic is deleted, cascade to related tables
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_topic_id_fkey,
ADD CONSTRAINT messages_topic_id_fkey 
  FOREIGN KEY (topic_id) 
  REFERENCES public.topics(id) 
  ON DELETE CASCADE;

ALTER TABLE public.thread_workflow_states 
DROP CONSTRAINT IF EXISTS thread_workflow_states_topic_id_fkey,
ADD CONSTRAINT thread_workflow_states_topic_id_fkey 
  FOREIGN KEY (topic_id) 
  REFERENCES public.topics(id) 
  ON DELETE CASCADE;

ALTER TABLE public.smart_thread_entities 
DROP CONSTRAINT IF EXISTS smart_thread_entities_topic_id_fkey,
ADD CONSTRAINT smart_thread_entities_topic_id_fkey 
  FOREIGN KEY (topic_id) 
  REFERENCES public.topics(id) 
  ON DELETE CASCADE;

ALTER TABLE public.thread_assignments 
DROP CONSTRAINT IF EXISTS thread_assignments_topic_id_fkey,
ADD CONSTRAINT thread_assignments_topic_id_fkey 
  FOREIGN KEY (topic_id) 
  REFERENCES public.topics(id) 
  ON DELETE CASCADE;

-- When a channel is deleted, cascade to topics and members
ALTER TABLE public.topics 
DROP CONSTRAINT IF EXISTS topics_channel_id_fkey,
ADD CONSTRAINT topics_channel_id_fkey 
  FOREIGN KEY (channel_id) 
  REFERENCES public.channels(id) 
  ON DELETE CASCADE;

ALTER TABLE public.channel_members 
DROP CONSTRAINT IF EXISTS channel_members_channel_id_fkey,
ADD CONSTRAINT channel_members_channel_id_fkey 
  FOREIGN KEY (channel_id) 
  REFERENCES public.channels(id) 
  ON DELETE CASCADE;