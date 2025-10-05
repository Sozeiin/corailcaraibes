import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Channel } from '@/types/messaging';
import { ChannelMembersSelector } from './ChannelMembersSelector';

interface ChannelEditDialogProps {
  channel: Channel;
  isOpen: boolean;
  onClose: () => void;
}

export function ChannelEditDialog({ channel, isOpen, onClose }: ChannelEditDialogProps) {
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description || '');
  const [channelType, setChannelType] = useState<'public' | 'private'>(channel.channel_type);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Charger les membres existants du canal
  const { data: existingMembers } = useQuery({
    queryKey: ['channel-members', channel.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channel_members')
        .select('user_id')
        .eq('channel_id', channel.id);

      if (error) throw error;
      return data.map(m => m.user_id);
    },
    enabled: channel.channel_type === 'private',
  });

  useEffect(() => {
    if (existingMembers) {
      setSelectedMemberIds(existingMembers);
    }
  }, [existingMembers]);

  const updateChannel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('channels')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          channel_type: channelType,
        })
        .eq('id', channel.id);

      if (error) throw error;

      // Gérer les membres si le canal est privé
      if (channelType === 'private') {
        // Supprimer les anciens membres
        await supabase
          .from('channel_members')
          .delete()
          .eq('channel_id', channel.id);

        // Ajouter les nouveaux membres
        if (selectedMemberIds.length > 0) {
          const members = selectedMemberIds.map(userId => ({
            channel_id: channel.id,
            user_id: userId,
          }));

          const { error: membersError } = await supabase
            .from('channel_members')
            .insert(members);

          if (membersError) throw membersError;
        }
      } else {
        // Si passage en public, supprimer tous les membres
        await supabase
          .from('channel_members')
          .delete()
          .eq('channel_id', channel.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-channels'] });
      toast({
        title: 'Canal mis à jour',
        description: 'Les modifications ont été enregistrées',
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour le canal',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateChannel.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modifier le canal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nom du canal *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-type">Type de canal</Label>
            <Select value={channelType} onValueChange={(v) => setChannelType(v as 'public' | 'private')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Privé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {channelType === 'private' && (
            <ChannelMembersSelector
              selectedUserIds={selectedMemberIds}
              onChange={setSelectedMemberIds}
            />
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={updateChannel.isPending}>
              {updateChannel.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
