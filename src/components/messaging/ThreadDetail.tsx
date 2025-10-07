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
          assignments:thread_assignments(*)
        `)
        .eq('id', threadId)
        .single();

      if (error) throw error;

      // Récupérer les profils utilisateurs pour les assignations
      if (data.assignments && data.assignments.length > 0) {
        const userIds = data.assignments.map((a: any) => a.user_id);
        const { data: users } = await supabase
          .from('profiles')
          .select('id, name, role')
          .in('id', userIds);

        const usersMap = new Map(users?.map(u => [u.id, u]) || []);
        data.assignments = data.assignments.map((a: any) => ({
          ...a,
          user: usersMap.get(a.user_id)
        }));
      }

      // Enrichir les entités avec leurs détails
      if (data.entities && data.entities.length > 0) {
        const enrichedEntities = await Promise.all(
          data.entities.map(async (entity: any) => {
            let entityDetails = null;

            try {
              switch (entity.entity_type) {
                case 'boat': {
                  const { data: boat } = await supabase
                    .from('boats')
                    .select('name, serial_number')
                    .eq('id', entity.entity_id)
                    .single();
                  if (boat) entityDetails = { name: boat.name, reference: boat.serial_number };
                  break;
                }
                case 'order': {
                  const { data: order } = await supabase
                    .from('orders')
                    .select('order_number')
                    .eq('id', entity.entity_id)
                    .single();
                  if (order) entityDetails = { name: order.order_number, reference: order.order_number };
                  break;
                }
                case 'intervention': {
                  const { data: intervention } = await supabase
                    .from('interventions')
                    .select('title')
                    .eq('id', entity.entity_id)
                    .single();
                  if (intervention) entityDetails = { name: intervention.title };
                  break;
                }
                case 'stock_item': {
                  const { data: stock } = await supabase
                    .from('stock_items')
                    .select('name, reference')
                    .eq('id', entity.entity_id)
                    .single();
                  if (stock) entityDetails = { name: stock.name, reference: stock.reference };
                  break;
                }
                case 'supply_request': {
                  const { data: supply } = await supabase
                    .from('supply_requests')
                    .select('request_number, item_name')
                    .eq('id', entity.entity_id)
                    .single();
                  if (supply) entityDetails = { name: supply.item_name, reference: supply.request_number };
                  break;
                }
                case 'checklist': {
                  const { data: checklist } = await supabase
                    .from('boat_checklists')
                    .select('id')
                    .eq('id', entity.entity_id)
                    .single();
                  if (checklist) entityDetails = { name: `Checklist ${checklist.id.substring(0, 8)}` };
                  break;
                }
              }
            } catch (err) {
              console.error('Error fetching entity details:', err);
            }

            return {
              ...entity,
              entity_details: entityDetails
            };
          })
        );

        data.entities = enrichedEntities;
      }

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

  // Fetch channels for the edit dialog
  const { data: channels = [] } = useQuery({
    queryKey: ['messaging-channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
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
      <ThreadHeader thread={thread} channels={channels} />

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <MessagesList messages={messages} isLoading={messagesLoading} />
      </ScrollArea>

      {/* Input pour nouveau message */}
      <MessageInput threadId={threadId} />
    </div>
  );
}
