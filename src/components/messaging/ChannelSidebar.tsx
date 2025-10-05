import React, { useState } from 'react';
import { Hash, Lock, Users, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChannelManagementDialog } from './ChannelManagementDialog';
import { ChannelEditDialog } from './ChannelEditDialog';
import { ChannelDeleteDialog } from './ChannelDeleteDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Channel } from '@/types/messaging';

interface ChannelSidebarProps {
  channels: Channel[];
  selectedChannelId: string | null;
  onChannelSelect: (channelId: string | null) => void;
}

export function ChannelSidebar({ channels, selectedChannelId, onChannelSelect }: ChannelSidebarProps) {
  const { user } = useAuth();
  const [editChannel, setEditChannel] = useState<Channel | null>(null);
  const [deleteChannel, setDeleteChannel] = useState<Channel | null>(null);
  
  const canManage = user?.role === 'direction' || user?.role === 'chef_base';

  // Récupérer les canaux privés dont l'utilisateur est membre
  const { data: userChannelMemberships = [] } = useQuery({
    queryKey: ['user-channel-memberships', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', user.id);

      if (error) throw error;
      return data.map(m => m.channel_id);
    },
    enabled: !!user?.id,
  });

  // Filtrer les canaux selon les permissions
  const visibleChannels = channels.filter(channel => {
    // Les canaux publics sont visibles par tous
    if (channel.channel_type === 'public') return true;
    
    // Les canaux privés sont visibles si l'utilisateur est direction, chef_base, ou membre
    return canManage || userChannelMemberships.includes(channel.id);
  });

  const publicChannels = visibleChannels.filter(c => c.channel_type === 'public');
  const privateChannels = visibleChannels.filter(c => c.channel_type === 'private');

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Canaux
        </h3>
      </div>

      <ScrollArea className="flex-1">
        {canManage && (
          <div className="p-2">
            <ChannelManagementDialog />
          </div>
        )}
        
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
              <div key={channel.id} className="group relative">
                <Button
                  variant={selectedChannelId === channel.id ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2 mb-1 pr-16",
                    selectedChannelId === channel.id && "bg-primary/10 text-primary"
                  )}
                  onClick={() => onChannelSelect(channel.id)}
                >
                  <Hash className="h-4 w-4" />
                  <span className="truncate">{channel.name}</span>
                </Button>
                {canManage && (
                  <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditChannel(channel);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteChannel(channel);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
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
              <div key={channel.id} className="group relative">
                <Button
                  variant={selectedChannelId === channel.id ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2 mb-1 pr-16",
                    selectedChannelId === channel.id && "bg-primary/10 text-primary"
                  )}
                  onClick={() => onChannelSelect(channel.id)}
                >
                  <Lock className="h-4 w-4" />
                  <span className="truncate">{channel.name}</span>
                </Button>
                {canManage && (
                  <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditChannel(channel);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteChannel(channel);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      
      {editChannel && (
        <ChannelEditDialog
          channel={editChannel}
          isOpen={!!editChannel}
          onClose={() => setEditChannel(null)}
        />
      )}
      
      <ChannelDeleteDialog
        channel={deleteChannel}
        isOpen={!!deleteChannel}
        onClose={() => setDeleteChannel(null)}
      />
    </div>
  );
}
