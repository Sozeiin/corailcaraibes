import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Channel } from '@/types/messaging';
import { ChannelMembersSelector } from './ChannelMembersSelector';

interface ChannelManagementDialogProps {
  onChannelCreated?: (channel: Channel) => void;
}

export function ChannelManagementDialog({ onChannelCreated }: ChannelManagementDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [channelType, setChannelType] = useState<'public' | 'private'>('public');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createChannel = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data, error } = await supabase
        .from('channels')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          channel_type: channelType,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Si canal privé, ajouter les membres sélectionnés
      if (channelType === 'private' && selectedMemberIds.length > 0) {
        const members = selectedMemberIds.map(userId => ({
          channel_id: data.id,
          user_id: userId,
        }));

        const { error: membersError } = await supabase
          .from('channel_members')
          .insert(members);

        if (membersError) throw membersError;
      }

      return data as Channel;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['messaging-channels'] });
      toast({
        title: 'Canal créé',
        description: `Le canal "${data.name}" a été créé avec succès`,
      });
      setIsOpen(false);
      setName('');
      setDescription('');
      setChannelType('public');
      setSelectedMemberIds([]);
      onChannelCreated?.(data);
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer le canal',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le nom du canal est requis',
        variant: 'destructive',
      });
      return;
    }
    createChannel.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau canal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Créer un nouveau canal
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du canal *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Support Client, Maintenance..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description du canal..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type de canal</Label>
            <Select value={channelType} onValueChange={(v) => setChannelType(v as 'public' | 'private')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public - Visible par tous</SelectItem>
                <SelectItem value="private">Privé - Membres uniquement</SelectItem>
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
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createChannel.isPending}>
              {createChannel.isPending ? 'Création...' : 'Créer le canal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
