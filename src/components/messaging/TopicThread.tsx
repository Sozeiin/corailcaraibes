import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageComposer } from "./MessageComposer";
import { MessageItem } from "./MessageItem";
import { TopicDetails } from "./TopicDetails";

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

  const { data: messages } = useQuery({
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
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold mb-2">{topic.title}</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Créé par {topic.created_by_profile?.name}</span>
          {topic.boat && <span>• {topic.boat.name}</span>}
          {topic.base && <span>• {topic.base.name}</span>}
        </div>
      </div>

      <Tabs defaultValue="messages" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full rounded-none border-b">
          <TabsTrigger value="messages" className="flex-1">Messages</TabsTrigger>
          <TabsTrigger value="details" className="flex-1">Détails</TabsTrigger>
        </TabsList>
        
        <TabsContent value="messages" className="flex-1 flex flex-col overflow-hidden m-0">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages?.map((message) => (
                <MessageItem key={message.id} message={message} />
              ))}
            </div>
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
