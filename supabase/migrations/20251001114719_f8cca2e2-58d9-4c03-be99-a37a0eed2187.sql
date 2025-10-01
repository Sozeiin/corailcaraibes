-- Phase 1: Tables pour le système Smart Threads (sans modifier les tables existantes)

-- Table pour lier les threads aux entités existantes (boats, orders, interventions, etc.)
CREATE TABLE IF NOT EXISTS public.smart_thread_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('boat', 'order', 'intervention', 'stock_item', 'supply_request', 'checklist')),
  entity_id UUID NOT NULL,
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  linked_by UUID REFERENCES auth.users(id),
  notes TEXT,
  UNIQUE(topic_id, entity_type, entity_id)
);

-- Table pour les états de workflow des threads
CREATE TABLE IF NOT EXISTS public.thread_workflow_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE UNIQUE,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'waiting_response', 'waiting_parts', 'blocked', 'resolved', 'closed', 'archived')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category TEXT CHECK (category IN ('sav', 'maintenance', 'supply', 'administrative', 'emergency', 'general')),
  assigned_to UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  estimated_response_time INTEGER, -- en heures
  actual_response_time INTEGER, -- en heures
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table pour les templates de réponse
CREATE TABLE IF NOT EXISTS public.response_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb, -- Variables disponibles dans le template
  base_id UUID REFERENCES public.bases(id),
  is_global BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table pour les assignations et suivi des responsables
CREATE TABLE IF NOT EXISTS public.thread_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  role TEXT CHECK (role IN ('assignee', 'watcher', 'approver')),
  is_active BOOLEAN DEFAULT true,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  UNIQUE(topic_id, user_id, role)
);

-- Indexes pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_smart_thread_entities_topic ON public.smart_thread_entities(topic_id);
CREATE INDEX IF NOT EXISTS idx_smart_thread_entities_entity ON public.smart_thread_entities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_thread_workflow_states_topic ON public.thread_workflow_states(topic_id);
CREATE INDEX IF NOT EXISTS idx_thread_workflow_states_status ON public.thread_workflow_states(status);
CREATE INDEX IF NOT EXISTS idx_thread_workflow_states_assigned ON public.thread_workflow_states(assigned_to);
CREATE INDEX IF NOT EXISTS idx_response_templates_category ON public.response_templates(category);
CREATE INDEX IF NOT EXISTS idx_thread_assignments_topic ON public.thread_assignments(topic_id);
CREATE INDEX IF NOT EXISTS idx_thread_assignments_user ON public.thread_assignments(user_id);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_thread_workflow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_thread_workflow_states_updated_at
  BEFORE UPDATE ON public.thread_workflow_states
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_workflow_updated_at();

CREATE TRIGGER update_response_templates_updated_at
  BEFORE UPDATE ON public.response_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.smart_thread_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_workflow_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.response_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_assignments ENABLE ROW LEVEL SECURITY;

-- Policies pour smart_thread_entities
CREATE POLICY "Users can view thread entities for their topics"
  ON public.smart_thread_entities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.topics t
      JOIN public.channels c ON c.id = t.channel_id
      WHERE t.id = smart_thread_entities.topic_id
      AND (
        get_user_role() = 'direction'
        OR c.channel_type = 'public'
        OR is_channel_member(c.id, auth.uid())
      )
    )
  );

CREATE POLICY "Users can manage thread entities for their topics"
  ON public.smart_thread_entities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.topics t
      JOIN public.channels c ON c.id = t.channel_id
      WHERE t.id = smart_thread_entities.topic_id
      AND (
        get_user_role() = 'direction'
        OR t.created_by = auth.uid()
        OR is_channel_member(c.id, auth.uid())
      )
    )
  );

-- Policies pour thread_workflow_states
CREATE POLICY "Users can view workflow states for their topics"
  ON public.thread_workflow_states FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.topics t
      JOIN public.channels c ON c.id = t.channel_id
      WHERE t.id = thread_workflow_states.topic_id
      AND (
        get_user_role() = 'direction'
        OR c.channel_type = 'public'
        OR is_channel_member(c.id, auth.uid())
      )
    )
  );

CREATE POLICY "Users can manage workflow states for their topics"
  ON public.thread_workflow_states FOR ALL
  USING (
    get_user_role() IN ('direction', 'chef_base')
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.topics t
      WHERE t.id = thread_workflow_states.topic_id
      AND t.created_by = auth.uid()
    )
  );

-- Policies pour response_templates
CREATE POLICY "Users can view response templates"
  ON public.response_templates FOR SELECT
  USING (
    is_global = true
    OR get_user_role() = 'direction'
    OR base_id = get_user_base_id()
  );

CREATE POLICY "Direction and chef_base can manage templates"
  ON public.response_templates FOR ALL
  USING (
    get_user_role() IN ('direction', 'chef_base')
    AND (get_user_role() = 'direction' OR base_id = get_user_base_id())
  );

-- Policies pour thread_assignments
CREATE POLICY "Users can view thread assignments"
  ON public.thread_assignments FOR SELECT
  USING (
    user_id = auth.uid()
    OR get_user_role() = 'direction'
    OR EXISTS (
      SELECT 1 FROM public.topics t
      JOIN public.channels c ON c.id = t.channel_id
      WHERE t.id = thread_assignments.topic_id
      AND is_channel_member(c.id, auth.uid())
    )
  );

CREATE POLICY "Users can manage their assignments"
  ON public.thread_assignments FOR ALL
  USING (
    get_user_role() IN ('direction', 'chef_base')
    OR user_id = auth.uid()
  );

-- Activer le realtime pour les nouvelles tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.smart_thread_entities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.thread_workflow_states;
ALTER PUBLICATION supabase_realtime ADD TABLE public.thread_assignments;