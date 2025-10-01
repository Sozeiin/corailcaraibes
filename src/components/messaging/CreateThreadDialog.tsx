import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Channel, ThreadCategory, ThreadPriority } from '@/types/messaging';

interface CreateThreadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: string | null;
  channels: Channel[];
}

export function CreateThreadDialog({ 
  isOpen, 
  onClose, 
  channelId, 
  channels 
}: CreateThreadDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState(channelId || '');
  const [category, setCategory] = useState<ThreadCategory>('general');
  const [priority, setPriority] = useState<ThreadPriority>('medium');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createThread = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Créer le topic
      const { data: topic, error: topicError } = await supabase
        .from('topics')
        .insert({
          channel_id: selectedChannelId,
          title,
          created_by: user.id,
        })
        .select()
        .single();

      if (topicError) throw topicError;

      // Créer le workflow state
      const { error: workflowError } = await supabase
        .from('thread_workflow_states')
        .insert({
          topic_id: topic.id,
          status: 'new',
          priority,
          category,
        });

      if (workflowError) throw workflowError;

      // Créer le premier message
      if (content.trim()) {
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            topic_id: topic.id,
            author_id: user.id,
            content: content.trim(),
          });

        if (messageError) throw messageError;
      }

      return topic;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-threads'] });
      toast({
        title: 'Succès',
        description: 'Le sujet a été créé avec succès',
      });
      onClose();
      resetForm();
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le sujet',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setTitle('');
    setContent('');
    setCategory('general');
    setPriority('medium');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedChannelId) return;
    createThread.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Créer un nouveau sujet</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="channel">Canal</Label>
            <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un canal" />
              </SelectTrigger>
              <SelectContent>
                {channels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    {channel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Titre du sujet</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Problème moteur sur bateau #12"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ThreadCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Général</SelectItem>
                  <SelectItem value="sav">SAV</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="supply">Approvisionnement</SelectItem>
                  <SelectItem value="administrative">Administratif</SelectItem>
                  <SelectItem value="emergency">Urgence</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priorité</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as ThreadPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Basse</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Message initial (optionnel)</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Décrivez le problème ou la demande..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={!title.trim() || !selectedChannelId || createThread.isPending}
            >
              Créer le sujet
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
