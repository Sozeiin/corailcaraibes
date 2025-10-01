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
      {/* Header du sujet */}
      <div className="p-5 border-b border-border bg-card">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h2 className="font-bold text-lg flex-1 leading-snug">{topic.title}</h2>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <TopicStatusBadge status={topic.status} />
            <TopicPriorityBadge priority={topic.priority} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Par <span className="font-medium text-foreground">{topic.created_by_profile?.name}</span></span>
          {topic.boat && (
            <>
              <span className="text-border">•</span>
              <span className="text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded">
                {topic.boat.name}
              </span>
            </>
          )}
          {topic.base && (
            <>
              <span className="text-border">•</span>
              <span className="text-muted-foreground">{topic.base.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Tabs Messages / Détails */}
      <Tabs defaultValue="messages" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full rounded-none border-b bg-card h-11">
          <TabsTrigger value="messages" className="flex-1 gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Messages</span>
          </TabsTrigger>
          <TabsTrigger value="details" className="flex-1">Détails</TabsTrigger>
        </TabsList>
        
        <TabsContent value="messages" className="flex-1 flex flex-col overflow-hidden m-0">
          <ScrollArea className="flex-1 p-4">
            {messagesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-4 max-w-4xl">
                {messages.map((message) => (
                  <MessageItem key={message.id} message={message} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-muted p-5 w-20 h-20 mb-4 flex items-center justify-center">
                  <MessageSquare className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-semibold mb-1">Aucun message</h3>
                <p className="text-xs text-muted-foreground max-w-[250px]">
                  Soyez le premier à répondre et lancer la discussion !
                </p>
              </div>
            )}
          </ScrollArea>
          
          <div className="border-t border-border p-4 bg-card">
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
