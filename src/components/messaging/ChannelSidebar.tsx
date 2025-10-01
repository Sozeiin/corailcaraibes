import React from 'react';
import { Hash, Lock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Channel } from '@/types/messaging';

interface ChannelSidebarProps {
  channels: Channel[];
  selectedChannelId: string | null;
  onChannelSelect: (channelId: string | null) => void;
}

export function ChannelSidebar({ channels, selectedChannelId, onChannelSelect }: ChannelSidebarProps) {
  const publicChannels = channels.filter(c => c.channel_type === 'public');
  const privateChannels = channels.filter(c => c.channel_type === 'private');

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Canaux
        </h3>
      </div>

      <ScrollArea className="flex-1">
        {/* Tous les canaux */}
        <div className="p-2">
          <Button
            variant={selectedChannelId === null ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start gap-2",
              selectedChannelId === null && "bg-primary/10 text-primary"
            )}
            onClick={() => onChannelSelect(null)}
          >
            <Users className="h-4 w-4" />
            <span>Tous les canaux</span>
          </Button>
        </div>

        {/* Canaux publics */}
        {publicChannels.length > 0 && (
          <div className="p-2">
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Publics
              </p>
            </div>
            {publicChannels.map((channel) => (
              <Button
                key={channel.id}
                variant={selectedChannelId === channel.id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2 mb-1",
                  selectedChannelId === channel.id && "bg-primary/10 text-primary"
                )}
                onClick={() => onChannelSelect(channel.id)}
              >
                <Hash className="h-4 w-4" />
                <span className="truncate">{channel.name}</span>
              </Button>
            ))}
          </div>
        )}

        {/* Canaux privés */}
        {privateChannels.length > 0 && (
          <div className="p-2">
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Privés
              </p>
            </div>
            {privateChannels.map((channel) => (
              <Button
                key={channel.id}
                variant={selectedChannelId === channel.id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2 mb-1",
                  selectedChannelId === channel.id && "bg-primary/10 text-primary"
                )}
                onClick={() => onChannelSelect(channel.id)}
              >
                <Lock className="h-4 w-4" />
                <span className="truncate">{channel.name}</span>
              </Button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
