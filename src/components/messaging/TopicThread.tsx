import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageComposer } from "./MessageComposer";
import { MessageItem } from "./MessageItem";
import { TopicDetails } from "./TopicDetails";
import { Loader2, MessageSquare } from "lucide-react";
import { TopicStatusBadge } from "./TopicStatusBadge";
import { TopicPriorityBadge } from "./TopicPriorityBadge";

interface TopicThreadProps {
  topicId: string;
}

export function TopicThread({ topicId }: TopicThreadProps) {
  const { data: topic } = useQuery({
    queryKey: ['topic', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select(`
          *,
          assigned_to_profile:profiles!topics_assigned_to_fkey(name),
          created_by_profile:profiles!topics_created_by_fkey(name),
          base:bases(name),
          boat:boats(name)
        `)
        .eq('id', topicId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!topicId
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          author:profiles!messages_author_id_fkey(name, role)
        `)
        .eq('topic_id', topicId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!topicId
  });

  if (!topic) return null;

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="font-semibold text-lg flex-1">{topic.title}</h2>
          <div className="flex items-center gap-2 flex-shrink-0">
            <TopicStatusBadge status={topic.status} />
            <TopicPriorityBadge priority={topic.priority} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Par {topic.created_by_profile?.name}</span>
          {topic.boat && (
            <>
              <span>•</span>
              <span className="text-primary font-medium">{topic.boat.name}</span>
            </>
          )}
          {topic.base && (
            <>
              <span>•</span>
              <span>{topic.base.name}</span>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="messages" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full rounded-none border-b">
          <TabsTrigger value="messages" className="flex-1">
            <MessageSquare className="h-4 w-4 mr-2" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="details" className="flex-1">Détails</TabsTrigger>
        </TabsList>
        
        <TabsContent value="messages" className="flex-1 flex flex-col overflow-hidden m-0">
          <ScrollArea className="flex-1 p-4">
            {messagesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((message) => (
                  <MessageItem key={message.id} message={message} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-12 w-12 mb-3 opacity-50 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Aucun message. Soyez le premier à répondre !
                </p>
              </div>
            )}
          </ScrollArea>
          
          <div className="border-t border-border p-4">
            <MessageComposer topicId={topicId} />
          </div>
        </TabsContent>
        
        <TabsContent value="details" className="flex-1 overflow-auto m-0">
          <TopicDetails topic={topic} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
