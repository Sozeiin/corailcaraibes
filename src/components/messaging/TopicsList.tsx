import { Plus, Search, Filter, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopicCard } from "./TopicCard";
import { useState } from "react";
import { NewTopicDialog } from "./NewTopicDialog";

interface TopicsListProps {
  channelId: string;
  selectedTopicId: string | null;
  onSelectTopic: (topicId: string) => void;
}

export function TopicsList({ channelId, selectedTopicId, onSelectTopic }: TopicsListProps) {
  const [search, setSearch] = useState("");
  const [showNewTopic, setShowNewTopic] = useState(false);

  const { data: topics, isLoading } = useQuery({
    queryKey: ['topics', channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select(`
          *,
          assigned_to_profile:profiles!topics_assigned_to_fkey(name),
          base:bases(name),
          boat:boats(name),
          messages:messages(count)
        `)
        .eq('channel_id', channelId)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data.map(topic => ({
        ...topic,
        message_count: topic.messages?.[0]?.count || 0
      }));
    },
    enabled: !!channelId
  });

  const filteredTopics = topics?.filter(topic =>
    topic.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header avec recherche */}
      <div className="p-4 border-b border-border space-y-3 bg-card">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un sujet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <Button size="icon" variant="outline" className="flex-shrink-0">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        
        <Button 
          onClick={() => setShowNewTopic(true)}
          className="w-full"
          size="default"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau sujet
        </Button>
      </div>

      {/* Liste des sujets */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTopics && filteredTopics.length > 0 ? (
          <div className="p-3 space-y-2">
            {filteredTopics.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                isSelected={selectedTopicId === topic.id}
                onClick={() => onSelectTopic(topic.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="rounded-full bg-muted p-4 w-16 h-16 mb-4 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold mb-2">Aucun sujet</h3>
            <p className="text-xs text-muted-foreground mb-4 max-w-[250px]">
              Créez un nouveau sujet pour commencer une discussion avec votre équipe
            </p>
            <Button 
              onClick={() => setShowNewTopic(true)}
              variant="default"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Créer un sujet
            </Button>
          </div>
        )}
      </ScrollArea>

      <NewTopicDialog
        open={showNewTopic}
        onOpenChange={setShowNewTopic}
        channelId={channelId}
      />
    </div>
  );
}
