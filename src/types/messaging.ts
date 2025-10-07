// Types pour le système de messagerie Smart Threads

export type ThreadStatus = 
  | 'new' 
  | 'in_progress' 
  | 'waiting_response' 
  | 'waiting_parts' 
  | 'blocked' 
  | 'resolved' 
  | 'closed' 
  | 'archived';

export type ThreadPriority = 'low' | 'medium' | 'high' | 'urgent';

export type ThreadCategory = 
  | 'sav' 
  | 'maintenance' 
  | 'supply' 
  | 'administrative' 
  | 'emergency' 
  | 'general';

export type EntityType = 
  | 'boat' 
  | 'order' 
  | 'intervention' 
  | 'stock_item' 
  | 'supply_request' 
  | 'checklist';

export type AssignmentRole = 'assignee' | 'watcher' | 'approver';

export interface Channel {
  id: string;
  name: string;
  description?: string;
  channel_type: 'public' | 'private';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Topic {
  id: string;
  channel_id: string;
  title: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  is_pinned?: boolean;
}

export interface Message {
  id: string;
  topic_id: string;
  author_id: string; // Supabase uses author_id not user_id
  content: string;
  created_at: string;
  updated_at: string;
  user?: {
    name: string;
    role: string;
  };
}

export interface ThreadWorkflowState {
  id: string;
  topic_id: string;
  status: ThreadStatus;
  priority: ThreadPriority;
  category?: ThreadCategory;
  assigned_to?: string;
  assigned_at?: string;
  due_date?: string;
  resolved_at?: string;
  resolved_by?: string;
  estimated_response_time?: number;
  actual_response_time?: number;
  created_at: string;
  updated_at: string;
  assignee?: {
    name: string;
    role: string;
  };
}

export interface SmartThreadEntity {
  id: string;
  topic_id: string;
  entity_type: EntityType;
  entity_id: string;
  linked_at: string;
  linked_by?: string;
  notes?: string;
  entity_details?: {
    name: string;
    reference?: string;
  };
}

export interface ThreadAssignment {
  id: string;
  topic_id: string;
  user_id: string;
  assigned_by?: string;
  assigned_at: string;
  role: AssignmentRole;
  is_active: boolean;
  completed_at?: string;
  notes?: string;
  user?: {
    name: string;
    role: string;
  };
}

export interface ResponseTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  variables?: string[];
  base_id?: string;
  is_global: boolean;
  usage_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SmartThread extends Topic {
  channel: Channel;
  workflow_state?: ThreadWorkflowState;
  entities?: SmartThreadEntity[];
  assignments?: ThreadAssignment[];
  message_count?: number;
  unread_count?: number;
  last_message?: Message;
}

export interface ThreadFilters {
  status?: ThreadStatus[];
  priority?: ThreadPriority[];
  category?: ThreadCategory[];
  assigned_to?: string;
  created_by?: string;
  search?: string;
  channel_id?: string;
}
