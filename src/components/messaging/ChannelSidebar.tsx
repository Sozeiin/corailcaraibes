import { useState } from "react";
import { Plus, Hash, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NewChannelDialog } from "./NewChannelDialog";

interface ChannelSidebarProps {
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
}

export function ChannelSidebar({ selectedChannelId, onSelectChannel }: ChannelSidebarProps) {
  const [isNewChannelOpen, setIsNewChannelOpen] = useState(false);

  const { data: channels, isLoading } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select(`
          *,
          topics:topics(count)
        `)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  return (
    <>
      <div className="flex flex-col h-full bg-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Canaux</h2>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0"
              onClick={() => setIsNewChannelOpen(true)}
              title="Créer un canal"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : channels && channels.length > 0 ? (
            <div className="p-2 space-y-0.5">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                    selectedChannelId === channel.id
                      ? "bg-accent text-accent-foreground font-medium shadow-sm"
                      : "hover:bg-accent/50"
                  )}
                >
                  {channel.channel_type === 'private' ? (
                    <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="flex-1 text-left truncate">{channel.name}</span>
                  {channel.topics?.[0]?.count > 0 && (
                    <Badge variant="secondary" className="h-5 px-2 text-xs font-normal">
                      {channel.topics[0].count}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Hash className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucun canal disponible</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => setIsNewChannelOpen(true)}
              >
                Créer un canal
              </Button>
            </div>
          )}
        </ScrollArea>
      </div>

      <NewChannelDialog 
        open={isNewChannelOpen} 
        onOpenChange={setIsNewChannelOpen} 
      />
    </>
  );
}
