import React, { useState } from 'react';
import { Hash, Lock, Users, Plus, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChannelManagementDialog } from './ChannelManagementDialog';
import { ChannelEditDialog } from './ChannelEditDialog';
import { ChannelDeleteDialog } from './ChannelDeleteDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Channel } from '@/types/messaging';

interface ChannelSelectorProps {
  channels: Channel[];
  selectedChannelId: string | null;
  onChannelSelect: (channelId: string | null) => void;
  threadCount?: number;
}

export function ChannelSelector({ 
  channels, 
  selectedChannelId, 
  onChannelSelect,
  threadCount = 0 
}: ChannelSelectorProps) {
  const { user } = useAuth();
  const [editChannel, setEditChannel] = useState<Channel | null>(null);
  const [deleteChannel, setDeleteChannel] = useState<Channel | null>(null);
  
  const canManage = user?.role === 'direction' || user?.role === 'chef_base';
  const canDelete = user?.role === 'direction';

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

  // Récupérer le nombre de threads par canal
  const { data: threadCounts = {} } = useQuery({
    queryKey: ['channel-thread-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('channel_id');

      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(topic => {
        if (topic.channel_id) {
          counts[topic.channel_id] = (counts[topic.channel_id] || 0) + 1;
        }
      });
      
      return counts;
    },
  });

  // Filtrer les canaux selon les permissions
  const visibleChannels = channels.filter(channel => {
    if (channel.channel_type === 'public') return true;
    return canManage || userChannelMemberships.includes(channel.id);
  });

  const publicChannels = visibleChannels.filter(c => c.channel_type === 'public');
  const privateChannels = visibleChannels.filter(c => c.channel_type === 'private');
  
  const selectedChannel = channels.find(c => c.id === selectedChannelId);
  const totalThreads = Object.values(threadCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Select 
        value={selectedChannelId || "all"} 
        onValueChange={(value) => onChannelSelect(value === "all" ? null : value)}
      >
        <SelectTrigger className="w-full sm:w-[320px]">
          <SelectValue>
            {selectedChannel ? (
              <div className="flex items-center gap-2">
                {selectedChannel.channel_type === 'public' ? 
                  <Hash className="h-4 w-4" /> : 
                  <Lock className="h-4 w-4" />
                }
                <span className="truncate">{selectedChannel.name}</span>
                {threadCounts[selectedChannel.id] > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {threadCounts[selectedChannel.id]}
                  </Badge>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Tous les canaux</span>
                {totalThreads > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {totalThreads}
                  </Badge>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-background">
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Tous les canaux</span>
              {totalThreads > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {totalThreads}
                </Badge>
              )}
            </div>
          </SelectItem>

          {publicChannels.length > 0 && (
            <SelectGroup>
              <SelectLabel>Canaux Publics</SelectLabel>
              {publicChannels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    <span className="truncate">{channel.name}</span>
                    {threadCounts[channel.id] > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {threadCounts[channel.id]}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {privateChannels.length > 0 && (
            <SelectGroup>
              <SelectLabel>Canaux Privés</SelectLabel>
              {privateChannels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <span className="truncate">{channel.name}</span>
                    {threadCounts[channel.id] > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {threadCounts[channel.id]}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>

      {canManage && (
        <ChannelManagementDialog />
      )}
      
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
