import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThreadCard } from './ThreadCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SmartThread } from '@/types/messaging';

interface ThreadsListProps {
  channelId: string | null;
  selectedThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
}

export function ThreadsList({ channelId, selectedThreadId, onThreadSelect }: ThreadsListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['messaging-threads', channelId],
    queryFn: async () => {
      let query = supabase
        .from('topics')
        .select(`
          *,
          channel:channels(*),
          workflow_state:thread_workflow_states(*),
          messages(count)
        `)
        .order('updated_at', { ascending: false });

      if (channelId) {
        query = query.eq('channel_id', channelId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(topic => ({
        ...topic,
        message_count: topic.messages?.[0]?.count || 0,
      })) as SmartThread[];
    },
    enabled: true,
  });

  const filteredThreads = threads.filter(thread => 
    thread.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search & Filters */}
      <div className="p-4 border-b space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un sujet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" className="w-full">
          <Filter className="h-4 w-4 mr-2" />
          Filtres
        </Button>
      </div>

      {/* Threads List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredThreads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Aucun sujet trouvé</p>
            </div>
          ) : (
            filteredThreads.map((thread) => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                isSelected={selectedThreadId === thread.id}
                onClick={() => onThreadSelect(thread.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
