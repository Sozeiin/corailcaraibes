import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThreadHeader } from './ThreadHeader';
import { MessagesList } from './MessagesList';
import { MessageInput } from './MessageInput';
import type { SmartThread, Message } from '@/types/messaging';

interface ThreadDetailProps {
  threadId: string;
}

export function ThreadDetail({ threadId }: ThreadDetailProps) {
  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: ['messaging-thread', threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select(`
          *,
          channel:channels(*),
          workflow_state:thread_workflow_states(*),
          entities:smart_thread_entities(*),
          assignments:thread_assignments(
            *,
            user:profiles(id, name, role)
          )
        `)
        .eq('id', threadId)
        .single();

      if (error) throw error;
      return data as any;
    },
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['messaging-messages', threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('topic_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Get user info for messages
      const userIds = [...new Set(data.map(m => m.author_id))];
      const { data: users } = await supabase
        .from('profiles')
        .select('id, name, role')
        .in('id', userIds);

      const usersMap = new Map(users?.map(u => [u.id, u]) || []);
      
      return data.map(m => ({
        ...m,
        user: usersMap.get(m.author_id)
      })) as any[];
    },
  });

  if (threadLoading || !thread) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header avec infos du thread */}
      <ThreadHeader thread={thread} />

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <MessagesList messages={messages} isLoading={messagesLoading} />
      </ScrollArea>

      {/* Input pour nouveau message */}
      <MessageInput threadId={threadId} />
    </div>
  );
}
