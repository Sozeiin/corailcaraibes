-- Créer les enums pour la messagerie
CREATE TYPE channel_type AS ENUM ('public', 'private');
CREATE TYPE topic_status AS ENUM ('todo', 'in_progress', 'waiting', 'validation', 'closed');
CREATE TYPE topic_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Table des canaux
CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  channel_type channel_type NOT NULL DEFAULT 'public',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des membres de canaux
CREATE TABLE public.channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- Table des sujets
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status topic_status NOT NULL DEFAULT 'todo',
  priority topic_priority NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES profiles(id),
  base_id UUID REFERENCES bases(id),
  boat_id UUID REFERENCES boats(id),
  due_date DATE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  message_count INTEGER DEFAULT 0,
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID REFERENCES profiles(id)
);

-- Table des messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  mentions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  edited BOOLEAN DEFAULT false
);

-- Table des items de checklist
CREATE TABLE public.topic_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_topics_channel ON topics(channel_id);
CREATE INDEX idx_topics_status ON topics(status);
CREATE INDEX idx_topics_assigned ON topics(assigned_to);
CREATE INDEX idx_topics_base ON topics(base_id);
CREATE INDEX idx_topics_boat ON topics(boat_id);
CREATE INDEX idx_messages_topic ON messages(topic_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_channel_members_user ON channel_members(user_id);

-- Enable RLS
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour channels
CREATE POLICY "Direction can manage all channels" ON public.channels
FOR ALL USING (get_user_role() = 'direction');

CREATE POLICY "Users can view public channels" ON public.channels
FOR SELECT USING (channel_type = 'public');

CREATE POLICY "Users can view private channels they are member of" ON public.channels
FOR SELECT USING (
  channel_type = 'private' AND EXISTS (
    SELECT 1 FROM channel_members 
    WHERE channel_id = channels.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Chef_base can create channels" ON public.channels
FOR INSERT WITH CHECK (
  get_user_role() IN ('direction', 'chef_base')
);

-- RLS Policies pour channel_members
CREATE POLICY "Users can view channel members" ON public.channel_members
FOR SELECT USING (
  get_user_role() = 'direction' OR
  EXISTS (
    SELECT 1 FROM channels 
    WHERE id = channel_members.channel_id 
    AND (channel_type = 'public' OR EXISTS (
      SELECT 1 FROM channel_members cm2 
      WHERE cm2.channel_id = channels.id AND cm2.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Direction and admins can manage members" ON public.channel_members
FOR ALL USING (
  get_user_role() IN ('direction', 'chef_base')
);

-- RLS Policies pour topics
CREATE POLICY "Users can view topics in accessible channels" ON public.topics
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM channels c
    LEFT JOIN channel_members cm ON cm.channel_id = c.id
    WHERE c.id = topics.channel_id
    AND (c.channel_type = 'public' OR cm.user_id = auth.uid() OR get_user_role() = 'direction')
  )
);

CREATE POLICY "Users can create topics" ON public.topics
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM channels c
    LEFT JOIN channel_members cm ON cm.channel_id = c.id
    WHERE c.id = channel_id
    AND (c.channel_type = 'public' OR cm.user_id = auth.uid() OR get_user_role() = 'direction')
  )
);

CREATE POLICY "Users can update topics" ON public.topics
FOR UPDATE USING (
  get_user_role() = 'direction' OR
  created_by = auth.uid() OR
  assigned_to = auth.uid() OR
  (get_user_role() IN ('chef_base', 'administratif'))
);

-- RLS Policies pour messages
CREATE POLICY "Users can view messages in accessible topics" ON public.messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM topics t
    JOIN channels c ON c.id = t.channel_id
    LEFT JOIN channel_members cm ON cm.channel_id = c.id
    WHERE t.id = messages.topic_id
    AND (c.channel_type = 'public' OR cm.user_id = auth.uid() OR get_user_role() = 'direction')
  )
);

CREATE POLICY "Users can create messages" ON public.messages
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM topics t
    JOIN channels c ON c.id = t.channel_id
    LEFT JOIN channel_members cm ON cm.channel_id = c.id
    WHERE t.id = topic_id
    AND (c.channel_type = 'public' OR cm.user_id = auth.uid() OR get_user_role() = 'direction')
  )
);

CREATE POLICY "Users can update their own messages" ON public.messages
FOR UPDATE USING (author_id = auth.uid());

-- RLS Policies pour checklist items
CREATE POLICY "Users can view checklist items" ON public.topic_checklist_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM topics t
    JOIN channels c ON c.id = t.channel_id
    LEFT JOIN channel_members cm ON cm.channel_id = c.id
    WHERE t.id = topic_checklist_items.topic_id
    AND (c.channel_type = 'public' OR cm.user_id = auth.uid() OR get_user_role() = 'direction')
  )
);

CREATE POLICY "Users can manage checklist items" ON public.topic_checklist_items
FOR ALL USING (
  get_user_role() = 'direction' OR
  EXISTS (
    SELECT 1 FROM topics t
    WHERE t.id = topic_checklist_items.topic_id
    AND (t.created_by = auth.uid() OR t.assigned_to = auth.uid())
  )
);

-- Trigger pour incrémenter message_count
CREATE OR REPLACE FUNCTION increment_topic_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE topics SET message_count = message_count + 1, updated_at = now()
  WHERE id = NEW.topic_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_message_count
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION increment_topic_message_count();

-- Trigger pour updated_at
CREATE TRIGGER update_channels_updated_at
BEFORE UPDATE ON channels
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topics_updated_at
BEFORE UPDATE ON topics
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON messages
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();