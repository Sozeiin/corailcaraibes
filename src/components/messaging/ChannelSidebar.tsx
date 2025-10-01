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
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base">Canaux</h2>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0 hover:bg-primary/10"
              onClick={() => setIsNewChannelOpen(true)}
              title="Créer un canal"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Liste des canaux */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : channels && channels.length > 0 ? (
            <div className="p-3 space-y-1">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all group",
                    selectedChannelId === channel.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-accent/50 text-foreground"
                  )}
                >
                  <div className={cn(
                    "flex-shrink-0",
                    selectedChannelId === channel.id ? "text-primary" : "text-muted-foreground"
                  )}>
                    {channel.channel_type === 'private' ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <Hash className="h-4 w-4" />
                    )}
                  </div>
                  <span className="flex-1 text-left truncate">{channel.name}</span>
                  {channel.topics?.[0]?.count > 0 && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "h-5 px-2 text-xs font-medium",
                        selectedChannelId === channel.id 
                          ? "bg-primary/20 text-primary" 
                          : "bg-muted"
                      )}
                    >
                      {channel.topics[0].count}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="rounded-full bg-muted p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <Hash className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">Aucun canal disponible</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsNewChannelOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
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
