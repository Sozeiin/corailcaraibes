import { Plus, Search, Filter } from "lucide-react";
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

  const { data: topics } = useQuery({
    queryKey: ['topics', channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select(`
          *,
          assigned_to_profile:profiles!topics_assigned_to_fkey(name),
          base:bases(name),
          boat:boats(name)
        `)
        .eq('channel_id', channelId)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!channelId
  });

  const filteredTopics = topics?.filter(topic =>
    topic.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un sujet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button size="icon" variant="outline">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        
        <Button 
          onClick={() => setShowNewTopic(true)}
          className="w-full"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau sujet
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredTopics?.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Aucun sujet. Créez-en un !
            </div>
          ) : (
            filteredTopics?.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                isSelected={selectedTopicId === topic.id}
                onClick={() => onSelectTopic(topic.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <NewTopicDialog
        open={showNewTopic}
        onOpenChange={setShowNewTopic}
        channelId={channelId}
      />
    </div>
  );
}
